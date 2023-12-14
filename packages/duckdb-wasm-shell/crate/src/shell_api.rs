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
use std::cell::RefCell;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;

thread_local! {
    static FIT_ADDON: RefCell<FitAddon> = RefCell::new(FitAddon::new());
}

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
            .with_font_family(&options.get_font_family())
            .with_font_size(14) // XXX Make this dynamic based on the device width
            .with_draw_bold_text_in_bright_colors(true)
            .with_right_click_selects_word(true)
            .with_proposed_api(true)
            .with_theme(
                Theme::new()
                    .with_bright_yellow("#FFF000")
                    .with_foreground("#FFFFFF")
                    .with_background(&options.get_bg()),
            ),
    );
    terminal.open(elem);

    if options.with_webgl() {
        let addon_webgl = WebglAddon::new(None);
        terminal.load_addon(addon_webgl.clone().dyn_into::<WebglAddon>()?.into());
    }
    let links_addon = WebLinksAddon::new(None, None, None);
    let fit_addon = FIT_ADDON.with(|a| a.borrow().clone());
    terminal.load_addon(fit_addon.into());
    terminal.load_addon(links_addon.clone().dyn_into::<WebLinksAddon>()?.into());
    FIT_ADDON.with(|a| a.borrow().fit());

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

#[wasm_bindgen(js_name = "collectFileStatistics")]
pub fn collect_file_statistics(name: &str, enable: bool) {
    Shell::collect_file_statistics(name, enable);
}

#[wasm_bindgen(js_name = "resize")]
pub fn resize(_width: usize, _height: usize) {
    FIT_ADDON.with(|a| a.borrow().fit());
}

#[wasm_bindgen(js_name = "loadHistory")]
pub fn load_history(history: &js_sys::Array, cursor: usize) {
    let h: Vec<String> = history.iter().map(|ref v| v.as_string().unwrap()).collect();
    Shell::load_history(h, cursor);
}

#[wasm_bindgen(js_name = "passInitQueries")]
pub async fn pass_init_queries(queries: &js_sys::Array) -> Result<(), js_sys::Error> {
    let q: Vec<String> = queries.iter().map(|ref v| v.as_string().unwrap()).collect();
    Shell::pass_init_queries(q).await?;
    Ok(())
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
