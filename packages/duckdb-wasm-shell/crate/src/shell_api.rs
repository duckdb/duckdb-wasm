use crate::duckdb::AsyncDuckDB;
use crate::duckdb::AsyncDuckDBBindings;
use crate::shell;
use crate::shell_options;
use crate::shell_runtime;
use crate::xterm::addons::fit::FitAddon;
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
            .with_font_size(18)
            .with_draw_bold_text_in_bright_colors(true)
            .with_right_click_selects_word(true)
            .with_theme(
                Theme::new()
                    .with_foreground("#FFFFFF")
                    .with_background(&options.get_bg()),
            ),
    );
    terminal.set_any_option("cursorBlink", true.into());
    terminal.open(elem);

    let addon_fit = FitAddon::new();
    let addon_webgl = WebglAddon::new(None);
    terminal.load_addon(addon_fit.clone().dyn_into::<FitAddon>()?.into());
    terminal.load_addon(addon_webgl.clone().dyn_into::<WebglAddon>()?.into());
    addon_fit.fit();

    let foo = shell::Shell::global();
    let mut s = foo.lock().unwrap();
    s.attach(terminal, runtime);
    Ok(())
}

#[wasm_bindgen(js_name = "configureDatabase")]
pub async fn configure_database(db: AsyncDuckDBBindings) -> Result<(), js_sys::Error> {
    let foo = shell::Shell::global();
    let mut s = foo.lock().unwrap();
    s.configure_database(AsyncDuckDB::from_bindings(db)).await?;
    Ok(())
}
