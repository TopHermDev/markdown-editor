#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::fs;
use tauri::Emitter;
use tauri::Manager;

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, &content).map_err(|e| format!("Failed to write file: {}", e))
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![read_file, write_file])
        .setup(|app| {
            // Handle file path passed via CLI (from Linux file association / "Open with")
            let args: Vec<String> = env::args().collect();
            // Skip the first arg (binary name) and look for file paths
            let file_args: Vec<&str> = args
                .iter()
                .skip(1)
                .filter(|arg| !arg.starts_with('-'))
                .map(|s| s.as_str())
                .collect();

            if !file_args.is_empty() {
                // Emit the first file path to the frontend window
                let file_path = file_args[0].to_string();
                let window = app.get_webview_window("main").unwrap();
                window.emit("open-file", file_path).unwrap();
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
