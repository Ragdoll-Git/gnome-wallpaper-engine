# v1.3.0 — GNOME 50 & 51 Wayland Playback Update

After several attempts to keep the extension working smoothly across GNOME Shell versions, I decided to focus this release on GNOME 50 and newer. Their major changes exposed new issues in the extension, so this release addresses the most disruptive Wayland issues on GNOME 50 and 51 and adds the requested multi-monitor support. The existing renderer for GNOME Shell 45–49 remains unchanged.

If this update is useful to you, you can support its continued development:

<div>
	<a href="https://nowpayments.io/donation?api_key=EWJ623W-6JTM04F-JC4F777-AR6TW2K" target="_blank" rel="noreferrer noopener"><img src="https://nowpayments.io/images/embeds/donation-button-white.svg" width="100" alt="Donate with NOWPayments"></a>
	&nbsp;&nbsp;
	<a href="https://ko-fi.com/achu94" target="_blank" rel="noreferrer noopener"><img src="https://ko-fi.com/img/githubbutton_sm.svg" width="160" alt="Support development on Ko-fi"></a>
</div>

## 🚀 Changelog (v1.3.0)

### GNOME 50 & 51 (Wayland)

These improvements are specific to the new Wayland renderer used on GNOME Shell 50 and 51. GNOME Shell 45–49 continue to use the existing renderer.

- **GNOME 51 support:** GNOME Shell 51 is now officially supported.
- **Multi-monitor playback:** Live wallpapers now appear across connected monitors, with rendering adapted to each display's resolution and scaling, including fractional scaling such as 125% or 150%.
- **Fixed desktop background:** The mpv window stays behind desktop content and can no longer be dragged or take focus.
- **Clickable desktop icons:** Mouse input passes through the wallpaper, keeping DING desktop icons visible and clickable.
- **Reliable playback startup:** The new renderer uses mpv and does not require ClutterGst or GStreamer.

Hardware decoding depends on the installed mpv build, GPU drivers, and video codec.

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

