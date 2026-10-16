import Cairo from "cairo";
import Clutter from "gi://Clutter";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import Meta from "gi://Meta";
import * as Main from "resource:///org/gnome/shell/ui/main.js";

import { StaticWallpaper } from "./staticWallpaper.js";
import { getBackgroundsDir } from "./utils.js";

const RENDERER_WINDOW_PREFIX = "gwe-wallpaper-";

function getMonitorBounds(monitors) {
    if (!monitors.length) return null;

    const x = Math.min(...monitors.map(({ x }) => x));
    const y = Math.min(...monitors.map(({ y }) => y));
    const right = Math.max(...monitors.map(({ x, width }) => x + width));
    const bottom = Math.max(...monitors.map(({ y, height }) => y + height));
    return { x, y, width: right - x, height: bottom - y };
}

export class Wallpaper {
    constructor(ext, windowFilter) {
        this._ext = ext;
        this._windowFilter = windowFilter;
        this._staticWallpaper = new StaticWallpaper();
        this._process = null;
        this._waylandClient = null;
        this._sessionId = null;
        this._sourceActor = null;
        this._clones = [];
        this._mapTimeoutId = null;

        this._windowMapId = global.window_manager.connect_after(
            "map",
            (_windowManager, windowActor) => this._onWindowMapped(windowActor)
        );
        this._monitorsChangedId = Main.layoutManager.connect(
            "monitors-changed",
            () => {
                if (this._sessionId) this.start();
            }
        );
    }

    start() {
        this.stop();

        const filename = this._ext._settings.get_string("current-wallpaper");
        if (!filename) return;

        const bgDir = getBackgroundsDir();
        const videoPath = GLib.build_filenamev([bgDir, filename]);
        const baseName = filename.substring(0, filename.lastIndexOf("."));
        const thumbPath = GLib.build_filenamev([bgDir, `${baseName}-thumb.jpg`]);
        this._staticWallpaper.set(thumbPath);

        if (!GLib.getenv("WAYLAND_DISPLAY") || !Meta.WaylandClient?.new_subprocess) {
            Main.notify("Gnome Live Wallpaper", "GNOME Shell 50 on Wayland is required.");
            return;
        }

        const mpvPath = GLib.find_program_in_path("mpv");
        if (!mpvPath) {
            Main.notify("Gnome Live Wallpaper", "mpv was not found.");
            return;
        }

        const monitors = Main.layoutManager.monitors;
        const bounds = getMonitorBounds(monitors);
        if (!bounds) return;
        const sourceMonitor = monitors[0];

        const sessionId = GLib.uuid_string_random();
        this._sessionId = sessionId;
        const windowTitle = `${RENDERER_WINDOW_PREFIX}${sessionId}`;
        const argv = [
            mpvPath,
            "--vo=gpu",
            "--gpu-context=wayland",
            "--hwdec=auto",
            "--no-border",
            "--loop-file=inf",
            "--no-audio",
            "--force-window=immediate",
            `--title=${windowTitle}`,
            `--geometry=${sourceMonitor.width}x${sourceMonitor.height}+0+0`,
            "--keepaspect=no",
            "--keepaspect-window=no",
            "--no-auto-window-resize",
            "--osc=no",
            "--osd-bar=no",
            "--input-default-bindings=no",
            "--input-vo-keyboard=no",
            "--cursor-autohide=no",
            "--no-terminal",
            videoPath,
        ];

        try {
            const launcher = new Gio.SubprocessLauncher({
                flags: Gio.SubprocessFlags.NONE,
            });
            try {
                this._waylandClient = Meta.WaylandClient.new_subprocess(
                    global.context,
                    launcher,
                    argv
                );
            } finally {
                if (launcher.close) launcher.close();
            }

            this._process = this._waylandClient.get_subprocess();
            if (!this._process) throw new Error("Could not start the mpv Wayland client");

            const process = this._process;
            process.wait_async(null, (subprocess, result) => {
                try {
                    subprocess.wait_finish(result);
                } catch (error) {
                    logError(error);
                }

                if (this._process !== process) return;

                this._process = null;
                this._waylandClient = null;
                this._sessionId = null;
                this._sourceActor = null;
                this._destroyClones();
                if (this._mapTimeoutId) {
                    GLib.source_remove(this._mapTimeoutId);
                    this._mapTimeoutId = null;
                }
                if (!process.get_successful()) {
                    Main.notify("Gnome Live Wallpaper", "mpv stopped unexpectedly.");
                }
            });

            this._mapTimeoutId = GLib.timeout_add(
                GLib.PRIORITY_DEFAULT,
                5000,
                () => {
                    this._mapTimeoutId = null;
                    if (this._sessionId === sessionId && !this._sourceActor) {
                        Main.notify("Gnome Live Wallpaper", "The mpv window could not be attached.");
                        this.stop();
                    }
                    return GLib.SOURCE_REMOVE;
                }
            );
        } catch (error) {
            console.error("[Wallpaper] Error starting renderer:", error);
            Main.notify("Gnome Live Wallpaper", error.message);
            this.stop();
        }
    }

    _onWindowMapped(windowActor) {
        if (!this._sessionId || this._sourceActor) return;

        const metaWindow = windowActor.get_meta_window();
        const title = metaWindow?.get_title();
        if (!title?.startsWith(RENDERER_WINDOW_PREFIX)) return;
        if (title !== `${RENDERER_WINDOW_PREFIX}${this._sessionId}`) return;

        const monitors = Main.layoutManager.monitors;
        const bounds = getMonitorBounds(monitors);
        const sourceMonitor = monitors[0];
        const backgroundGroup = Main.layoutManager._backgroundGroup;
        if (!bounds || !sourceMonitor || !backgroundGroup) {
            Main.notify("Gnome Live Wallpaper", "GNOME's background group is unavailable.");
            this.stop();
            return;
        }

        try {
            metaWindow.set_type(Meta.WindowType.DESKTOP);
            metaWindow.stick();
            metaWindow.focus_on_click = false;
            if (typeof metaWindow.set_accept_focus === "function") {
                metaWindow.set_accept_focus(false);
            }
            try {
                metaWindow.set_input_region(new Cairo.Region());
            } catch (_) {
                // Some windowing backends don't support assigning an empty input region.
            }
            metaWindow.move_resize_frame(
                true,
                sourceMonitor.x,
                sourceMonitor.y,
                sourceMonitor.width,
                sourceMonitor.height
            );
            windowActor.set_position(sourceMonitor.x, sourceMonitor.y);
            windowActor.set_size(sourceMonitor.width, sourceMonitor.height);
            this._sourceActor = windowActor;
            const parent = windowActor.get_parent();
            if (parent) parent.remove_child(windowActor);
            backgroundGroup.add_child(windowActor);
            windowActor.set_reactive(false);

            this._clones = monitors.map((monitor) => {
                const clone = new Clutter.Clone({ source: windowActor });
                clone.set_position(monitor.x, monitor.y);
                clone.set_size(monitor.width, monitor.height);
                clone.set_reactive(false);
                backgroundGroup.add_child(clone);
                return clone;
            });

            const sourceX = bounds.x - sourceMonitor.width - 1;
            metaWindow.move_resize_frame(
                true,
                sourceX,
                sourceMonitor.y,
                sourceMonitor.width,
                sourceMonitor.height
            );
            windowActor.set_position(sourceX, sourceMonitor.y);
            metaWindow.lower();
            this._windowFilter?.addWindow(metaWindow);

            if (this._mapTimeoutId) {
                GLib.source_remove(this._mapTimeoutId);
                this._mapTimeoutId = null;
            }

            windowActor.connect("destroy", () => {
                this._windowFilter?.removeWindow(metaWindow);
                this._destroyClones();
                if (this._sourceActor !== windowActor) return;
                this._sourceActor = null;
            });
        } catch (error) {
            console.error("[Wallpaper] Error attaching renderer:", error);
            Main.notify("Gnome Live Wallpaper", error.message);
            this.stop();
        }
    }

    stop() {
        this._sessionId = null;
        if (this._mapTimeoutId) {
            GLib.source_remove(this._mapTimeoutId);
            this._mapTimeoutId = null;
        }
        this._destroyClones();
        this._sourceActor = null;
        if (this._process) this._process.force_exit();
        this._process = null;
        this._waylandClient = null;
    }

    _destroyClones() {
        for (const clone of this._clones) clone.destroy();
        this._clones = [];
    }

    destroy() {
        this.stop();
        if (this._windowMapId) {
            global.window_manager.disconnect(this._windowMapId);
            this._windowMapId = null;
        }
        if (this._monitorsChangedId) {
            Main.layoutManager.disconnect(this._monitorsChangedId);
            this._monitorsChangedId = null;
        }
    }
}