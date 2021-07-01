use crate::duckdb::AsyncDuckDB;
use crate::duckdb::JsAsyncDuckDB;
use crate::shell;
use crate::shell::Shell;
use crate::shell_options;
use crate::shell_runtime;
use crate::xterm::addons::fit::FitAddon;
use crate::xterm::addons::web_links::WebLinksAddon;
use crate::xterm::addons::webgl::WebglAddon;
use crate::xterm::{Terminal, TerminalOptions, Theme};
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;

#[wasm_bindgen(js_name = "embed")]
pub fn embed(
    elem: web_sys::HtmlElement,
    runtime: shell_runtime::ShellRuntime,
    options: shell_options::ShellOptions,
) -> Result<(), JsValue> {
    let terminal = Terminal::new(
        TerminalOptions::new()
            .with_rows(100)
            .with_cursor_blink(true)
            .with_cursor_width(10)
            .with_font_size(16)
            .with_draw_bold_text_in_bright_colors(true)
            .with_right_click_selects_word(true)
            .with_theme(
                Theme::new()
                    .with_bright_yellow("#FFF000")
                    .with_foreground("#FFFFFF")
                    .with_background(&options.get_bg()),
            ),
    );
    terminal.set_any_option("cursorBlink", true.into());
    terminal.open(elem);

    if options.with_webgl() {
        let addon_webgl = WebglAddon::new(None);
        terminal.load_addon(addon_webgl.clone().dyn_into::<WebglAddon>()?.into());
    }
    let addon_fit = FitAddon::new();
    let links_addon = WebLinksAddon::new(None, None, None);
    terminal.load_addon(addon_fit.clone().dyn_into::<FitAddon>()?.into());
    terminal.load_addon(links_addon.clone().dyn_into::<WebLinksAddon>()?.into());
    addon_fit.fit();

    Shell::with_mut(|s| s.attach(terminal, runtime, options));
    Ok(())
}

#[wasm_bindgen(js_name = "write")]
pub fn write(text: &str) {
    Shell::with(|s| s.write(text));
}

#[wasm_bindgen(js_name = "writeln")]
pub fn writeln(text: &str) {
    Shell::with(|s| s.writeln(text));
}

#[wasm_bindgen(js_name = "configureDatabase")]
pub async fn configure_database(db: JsAsyncDuckDB) -> Result<(), js_sys::Error> {
    Shell::configure_database(AsyncDuckDB::from_bindings(db)).await?;
    Ok(())
}

#[wasm_bindgen(js_name = "resumeAfterInput")]
pub async fn resume_after_input(ctx: shell::ShellInputContext) -> Result<(), js_sys::Error> {
    Shell::with_mut(|s| s.resume_after_input(ctx));
    Ok(())
}
