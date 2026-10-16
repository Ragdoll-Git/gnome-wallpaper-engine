# v1.2.2 — GNOME 50 Wayland Playback Update

> This took quite a few attempts to get right with GNOME Shell 50. If this release is useful to you, a small [donation](https://ko-fi.com/achu94) helps me keep improving it. Thank you for your support!

## 🚀 Changelog (v1.2.2)

### 🛠 Improvements

- **Multi-monitor renderer:** GNOME Shell creates a background clone for each connected monitor.
- **Shell-managed rendering:** The clones are inserted above the static wallpaper actors.
- **Playback dependencies:** mpv and ffmpeg remain required. ClutterGst and GStreamer packages are not needed.

### 🔧 Bugfixes

- **GNOME 50 playback startup:** Avoids the Clutter 1.0 versus 18 namespace conflict by keeping video playback in mpv and integrating its window content with GNOME Shell.
- **Renderer window handling:** The mpv source stays mapped as a desktop-type window so GNOME Shell can clone it into the background layer.

## ⚡ Notes

This build targets **GNOME Shell 50 on Wayland**. X11 and other GNOME Shell versions are not supported by this renderer yet. Hardware decoding depends on the installed mpv build, GPU drivers, and video codec.

## 🔗 Issues targeted (not yet verified)

The following issues motivated this renderer update. They should not be considered fixed until the behavior is verified on the supported GNOME Shell 50 Wayland setup.

- #9 — Prevent duplicate or orphaned mpv processes during wallpaper changes.
- #11 — Improve video scaling across displays with different aspect ratios.
- #14 — Display the live wallpaper across multiple monitors.
- #22 — Keep the wallpaper fixed as a background instead of an interactive window.
- #24 — Keep DING desktop icons visible and interactive with the live wallpaper enabled.

## ⚙️ Prerequisites

This extension requires **mpv** and **ffmpeg**:

- Fedora: `sudo dnf install mpv ffmpeg`
- Ubuntu/Debian: `sudo apt install mpv ffmpeg`
- Arch: `sudo pacman -S mpv ffmpeg`
- openSUSE: `sudo zypper in mpv ffmpeg`

## 📦 Installation

### ⚡ Quick Install (Recommended)

1. Download `gnome-wallpaper-engine@gjs.com.zip` below.
2. Run: `gnome-extensions install gnome-wallpaper-engine@gjs.com.zip`
3. Log out and back in on Wayland.
4. Enable the extension in the Extensions app.

## ☕ Support the Project

If you enjoy the project, consider supporting it at <https://ko-fi.com/achu94>.
