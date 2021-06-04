use crate::duckdb::AsyncDuckDB;
use crate::duckdb::AsyncDuckDBBindings;
use crate::shell;
use crate::shell_options;
use crate::xterm::addons::fit::FitAddon;
use crate::xterm::addons::webgl::WebglAddon;
use crate::xterm::{Terminal, TerminalOptions, Theme};
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;

#[wasm_bindgen(js_name = "embed")]
pub fn embed_shell(
    elem: web_sys::HtmlElement,
    props: shell_options::ShellOptions,
) -> Result<(), JsValue> {
    let terminal = Terminal::new(
        TerminalOptions::new()
            .with_rows(100)
            .with_cursor_blink(true)
            .with_cursor_width(10)
            .with_font_size(20)
            .with_draw_bold_text_in_bright_colors(true)
            .with_right_click_selects_word(true)
            .with_theme(
                Theme::new()
                    .with_foreground("#FFFFFF")
                    .with_background(&props.get_bg()),
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
    s.attach_terminal(terminal);
    Ok(())
}

#[wasm_bindgen(js_name = "attachAsyncDatabase")]
pub async fn attach_async_database(db: AsyncDuckDBBindings) {
    let foo = shell::Shell::global();
    let mut s = foo.lock().unwrap();
    s.attach_async_database(AsyncDuckDB::from_bindings(db))
        .await;
    //let foo = shell::Shell::global().clone();
    //let s = foo.lock().unwrap();
    //spawn_local(s.attach_async_database(AsyncDuckDB::from_bindings(db)))
}
