# Plugins and Runtime Features

## The Plugin Pattern — three steps, always

```bash
cargo tauri add fs        # 1. install (adds crate + JS package + registers)
```

```rust
// 2. ensure registered in lib.rs builder (tauri add usually does this)
tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
```

```json
// 3. add permission to a capability — WITHOUT THIS IT SILENTLY FAILS
{ "permissions": ["fs:default"] }
```

Official plugins: fs, dialog, shell, http, store, clipboard-manager,
notification, global-shortcut, updater, deep-link, opener, process. Check
the platform-support matrix at `v2.tauri.app/plugin/<name>/` before using
on mobile — several are desktop-only.

## Updater

Signing is **mandatory** — unsigned artifacts are rejected; endpoints must
be HTTPS.

```bash
cargo tauri signer generate -w ~/.tauri/myapp.key   # private key + pubkey
TAURI_SIGNING_PRIVATE_KEY=... TAURI_SIGNING_PRIVATE_KEY_PASSWORD=... cargo tauri build
# produces the update bundle + .sig ONLY when createUpdaterArtifacts is set
```

```json
// tauri.conf.json
{
  "bundle": { "createUpdaterArtifacts": true },
  "plugins": {
    "updater": {
      "endpoints": ["https://your-server.com/update/{{target}}/{{arch}}/{{current_version}}"],
      "pubkey": "CONTENT OF THE .pub FILE"
    }
  }
}
```

v2 has no `plugins.updater.active` key (that was v1's `tauri.updater.active`);
the plugin is on once registered. Without `bundle.createUpdaterArtifacts`
the build emits no `.sig` files. Use `"v1Compatible"` instead of `true`
only while migrating v1 users.

Server response shape:

```json
{
  "version": "1.0.1",
  "pub_date": "2026-04-02T00:00:00Z",
  "platforms": {
    "darwin-aarch64": { "signature": "<.sig content>", "url": "https://…/MyApp_1.0.1_aarch64.dmg" },
    "windows-x86_64": { "signature": "<.sig content>", "url": "https://…/MyApp_1.0.1_x64-setup.exe" }
  }
}
```

```rust
use tauri_plugin_updater::UpdaterExt;

#[tauri::command]
async fn check_for_updates(app: tauri::AppHandle) -> Result<String, String> {
    let update = app.updater().map_err(|e| e.to_string())?
        .check().await.map_err(|e| e.to_string())?;
    if let Some(update) = update {
        update.download_and_install(|_, _| {}, || {}).await.map_err(|e| e.to_string())?;
        Ok("Updated".into())
    } else {
        Ok("Already up to date".into())
    }
}
```

Capability: `updater:default`. Private key never in the repo —
`TAURI_SIGNING_PRIVATE_KEY` env in CI.

## System Tray (desktop-only)

```rust
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

tauri::Builder::default().setup(|app| {
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&quit])?;
    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .on_menu_event(|app, event| {
            if event.id.as_ref() == "quit" { app.exit(0); }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { button: MouseButton::Left,
                button_state: MouseButtonState::Up, .. } = event {
                if let Some(w) = tray.app_handle().get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
        })
        .build(app)?;
    Ok(())
});
```

Linux tray needs `libappindicator`/`libayatana-appindicator`; behaviour
varies by desktop environment.

## Sidecars (bundled external binaries)

```json
// tauri.conf.json
{ "bundle": { "externalBin": ["binaries/my-sidecar"] } }
```

```json
// capability — "name" matches the externalBin entry; "sidecar": true
{ "permissions": [{
    "identifier": "shell:allow-execute",
    "allow": [{ "name": "binaries/my-sidecar", "sidecar": true,
                "args": ["--flag", { "validator": "^[A-Za-z0-9._-]+$" }] }]
}] }
```

List the exact arguments the sidecar needs (fixed strings plus
`validator` regexes for dynamic slots); `"args": true` lets the webview
pass anything to the binary. `sidecar()` in Rust takes just the file
name (`"my-sidecar"`), not the `externalBin` path.

```rust
use tauri_plugin_shell::ShellExt;

#[tauri::command]
async fn run_sidecar(app: tauri::AppHandle) -> Result<String, String> {
    let output = app.shell().sidecar("my-sidecar").map_err(|e| e.to_string())?
        .args(["--flag", "value"])
        .output().await.map_err(|e| e.to_string())?;
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}
```

Binaries are per-target-triple:
`my-sidecar-x86_64-pc-windows-msvc.exe`,
`my-sidecar-aarch64-apple-darwin`, etc.

## Deep Links

`cargo tauri add deep-link`; configure schemes under
`plugins.deep-link.desktop/mobile` in tauri.conf.json; permission
`deep-link:default`; handle via
`app.deep_link().on_open_url(|event| ...)`. Desktop registration is
automatic (Info.plist / registry / .desktop file); mobile configures the
platform manifests.

## Serving Local Files — asset protocol

Prefer the built-in `asset:` protocol over custom URI schemes:

```json
{ "app": { "security": {
    "assetProtocol": { "enable": true, "scope": ["$APPDATA/assets/**"] },
    "csp": "default-src 'self'; img-src 'self' asset: http://asset.localhost"
} } }
```

v2 key is `assetProtocol` (`enable` + `scope`); v1's `assetScope` is gone.
Needs the `protocol-asset` feature on the `tauri` crate, and the CSP must
allow `asset:` and `http://asset.localhost`.

```typescript
import { convertFileSrc } from "@tauri-apps/api/core";
const imgSrc = convertFileSrc("/path/to/image.png");
```
