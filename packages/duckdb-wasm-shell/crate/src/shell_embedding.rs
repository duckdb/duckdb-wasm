use crate::codes;
use crate::print;
use crate::shell;
use crate::shell_options;
use crate::xterm::addons::fit::FitAddon;
use crate::xterm::addons::webgl::WebglAddon;
use crate::xterm::{OnKeyEvent, Terminal, TerminalOptions, Theme};
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

    let mut line = String::new();
    let mut cursor_col = 0;

    let term: Terminal = terminal.clone().dyn_into()?;

    let callback = Closure::wrap(Box::new(move |e: OnKeyEvent| {
        let event = e.dom_event();
        match event.key_code() {
            codes::KEY_ENTER => {
                if !line.is_empty() {
                    term.writeln("");
                    term.writeln(&format!("You entered {} characters '{}'", line.len(), line));
                    line.clear();
                    cursor_col = 0;
                }
                print::prompt(&term);
            }
            codes::KEY_BACKSPACE => {
                if cursor_col > 0 {
                    term.write("\u{0008} \u{0008}");
                    line.pop();
                    cursor_col -= 1;
                }
            }
            codes::KEY_LEFT_ARROW => {
                if cursor_col > 0 {
                    term.write(codes::CURSOR_LEFT);
                    cursor_col -= 1;
                }
            }
            codes::KEY_RIGHT_ARROW => {
                if cursor_col < line.len() {
                    term.write(codes::CURSOR_RIGHT);
                    cursor_col += 1;
                }
            }
            codes::KEY_L if event.ctrl_key() => term.clear(),
            codes::KEY_C if event.ctrl_key() => {
                print::prompt(&term);
                line.clear();
                cursor_col = 0;
            }
            _ => {
                if !event.alt_key() && !event.alt_key() && !event.ctrl_key() && !event.meta_key() {
                    term.write(&event.key());
                    line.push_str(&e.key());
                    cursor_col += 1;
                }
            }
        }
    }) as Box<dyn FnMut(_)>);

    terminal.on_key(callback.as_ref().unchecked_ref());
    callback.forget();

    print::prompt_nobreak(&terminal);
    terminal.focus();

    shell::Shell::global_mut(|ref mut s| s.attach(terminal));
    Ok(())
}
