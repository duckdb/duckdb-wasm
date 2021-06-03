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
    terminal.open(elem);

    let addon_fit = FitAddon::new();
    let addon_webgl = WebglAddon::new(None);
    terminal.load_addon(addon_fit.clone().dyn_into::<FitAddon>()?.into());
    terminal.load_addon(addon_webgl.clone().dyn_into::<WebglAddon>()?.into());
    addon_fit.fit();

    shell::Shell::global_mut(|ref mut s| {
        s.attach(terminal);
        s.write_greeter();
        s.focus();
    });
    Ok(())
}
