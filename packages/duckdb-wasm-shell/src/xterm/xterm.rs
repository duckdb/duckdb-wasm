use super::keys::*;
use js_sys::{Function, RegExp};
use wasm_bindgen::prelude::*;
use web_sys::{HtmlElement, HtmlTextAreaElement, KeyboardEvent, MouseEvent};

#[wasm_bindgen(module = "xterm")]
extern "C" {

    #[wasm_bindgen(js_name = "ITerminalOptions")]
    pub type TerminalOptions;

    #[wasm_bindgen(method, setter, js_name = "allowTransparency")]
    pub fn set_allow_transparency(this: &TerminalOptions, val: bool);

    #[wasm_bindgen(method, setter, js_name = "bellSound")]
    pub fn set_bell_sound(this: &TerminalOptions, val: &str);

    #[wasm_bindgen(method, setter, js_name = "bellStyle")]
    pub fn set_bell_style(this: &TerminalOptions, val: BellStyle);

    #[wasm_bindgen(method, setter, js_name = "convertEol")]
    pub fn set_convert_eol(this: &TerminalOptions, val: bool);

    #[wasm_bindgen(method, setter, js_name = "cols")]
    pub fn set_cols(this: &TerminalOptions, val: u32);

    #[wasm_bindgen(method, setter, js_name = "cursorBlink")]
    pub fn set_cursor_blink(this: &TerminalOptions, val: bool);

    #[wasm_bindgen(method, setter, js_name = "cursorStyle")]
    pub fn set_cursor_style(this: &TerminalOptions, val: CursorStyle);

    #[wasm_bindgen(method, setter, js_name = "cursorWidth")]
    pub fn set_cursor_width(this: &TerminalOptions, val: u32);

    #[wasm_bindgen(method, setter, js_name = "disableStdin")]
    pub fn set_disable_stdin(this: &TerminalOptions, val: bool);

    #[wasm_bindgen(method, setter, js_name = "drawBoldTextInBrightColors")]
    pub fn set_draw_bold_text_in_bright_colors(this: &TerminalOptions, val: bool);

    #[wasm_bindgen(method, setter, js_name = "fastScrollModifier")]
    pub fn set_fast_scroll_modifier(this: &TerminalOptions, val: FastScrollModifier);

    #[wasm_bindgen(method, setter, js_name = "fastScrollSensitivity")]
    pub fn set_fast_scroll_sensitivity(this: &TerminalOptions, val: u32);

    #[wasm_bindgen(method, setter, js_name = "fontSize")]
    pub fn set_font_size(this: &TerminalOptions, val: u32);

    #[wasm_bindgen(method, setter, js_name = "fontFamily")]
    pub fn set_font_family(this: &TerminalOptions, val: &str);

    #[wasm_bindgen(method, setter, js_name = "fontWeight")]
    pub fn set_font_weight(this: &TerminalOptions, val: FontWeight);

    #[wasm_bindgen(method, setter, js_name = "fontWeightBold")]
    pub fn set_font_weight_bold(this: &TerminalOptions, val: FontWeight);

    #[wasm_bindgen(method, setter, js_name = "letterSpacing")]
    pub fn set_letter_spacing(this: &TerminalOptions, val: u32);

    #[wasm_bindgen(method, setter, js_name = "lineHeight")]
    pub fn set_line_height(this: &TerminalOptions, val: u32);

    #[wasm_bindgen(method, setter, js_name = "linkTooltipHoverDuration")]
    pub fn set_link_tooltip_hover_duration(this: &TerminalOptions, val: u32);

    #[wasm_bindgen(method, setter, js_name = "logLevel")]
    pub fn set_log_level(this: &TerminalOptions, val: LogLevel);

    #[wasm_bindgen(method, setter, js_name = "macOptionIsMeta")]
    pub fn set_mac_option_is_meta(this: &TerminalOptions, val: bool);

    #[wasm_bindgen(method, setter, js_name = "macOptionClickForcesSelection")]
    pub fn set_mac_option_click_forces_selection(this: &TerminalOptions, val: bool);

    #[wasm_bindgen(method, setter, js_name = "minimumContrastRatio")]
    pub fn set_minimum_contrast_ratio(this: &TerminalOptions, val: u32);

    #[wasm_bindgen(method, setter, js_name = "rendererType")]
    pub fn set_renderer_type(this: &TerminalOptions, val: RendererType);

    #[wasm_bindgen(method, setter, js_name = "rightClickSelectsWord")]
    pub fn set_right_click_selects_word(this: &TerminalOptions, val: bool);

    #[wasm_bindgen(method, setter, js_name = "rows")]
    pub fn set_rows(this: &TerminalOptions, val: u32);

    #[wasm_bindgen(method, setter, js_name = "screenReaderMode")]
    pub fn set_screen_reader_mode(this: &TerminalOptions, val: bool);

    #[wasm_bindgen(method, setter, js_name = "scrollback")]
    pub fn set_scrollback(this: &TerminalOptions, val: u32);

    #[wasm_bindgen(method, setter, js_name = "scrollSensitivity")]
    pub fn set_scroll_sensitivity(this: &TerminalOptions, val: u32);

    #[wasm_bindgen(method, setter, js_name = "tabStopWidth")]
    pub fn set_tab_stop_width(this: &TerminalOptions, val: u32);

    #[wasm_bindgen(method, setter, js_name = "theme")]
    pub fn set_theme(this: &TerminalOptions, val: &Theme);

    #[wasm_bindgen(method, setter, js_name = "windowsMode")]
    pub fn set_windows_mode(this: &TerminalOptions, val: bool);

    #[wasm_bindgen(method, setter, js_name = "wordSeparator")]
    pub fn set_word_separator(this: &TerminalOptions, val: &str);

    #[wasm_bindgen(method, setter, js_name = "windowOptions")]
    pub fn set_window_options(this: &TerminalOptions, val: &WindowOptions);

    // ========================================================================

    #[wasm_bindgen(js_name = "ITheme")]
    pub type Theme;

    #[wasm_bindgen(method, setter, js_name = "foreground")]
    pub fn set_foreground(this: &Theme, val: &str);

    #[wasm_bindgen(method, setter, js_name = "background")]
    pub fn set_background(this: &Theme, val: &str);

    #[wasm_bindgen(method, setter, js_name = "cursor")]
    pub fn set_cursor(this: &Theme, val: &str);

    #[wasm_bindgen(method, setter, js_name = "cursorAccent")]
    pub fn set_cursor_accent(this: &Theme, val: &str);

    #[wasm_bindgen(method, setter, js_name = "selection")]
    pub fn set_selection(this: &Theme, val: &str);

    #[wasm_bindgen(method, setter, js_name = "black")]
    pub fn set_black(this: &Theme, val: &str);

    #[wasm_bindgen(method, setter, js_name = "red")]
    pub fn set_red(this: &Theme, val: &str);

    #[wasm_bindgen(method, setter, js_name = "green")]
    pub fn set_green(this: &Theme, val: &str);

    #[wasm_bindgen(method, setter, js_name = "yellow")]
    pub fn set_yellow(this: &Theme, val: &str);

    #[wasm_bindgen(method, setter, js_name = "blue")]
    pub fn set_blue(this: &Theme, val: &str);

    #[wasm_bindgen(method, setter, js_name = "magenta")]
    pub fn set_magenta(this: &Theme, val: &str);

    #[wasm_bindgen(method, setter, js_name = "cyan")]
    pub fn set_cyan(this: &Theme, val: &str);

    #[wasm_bindgen(method, setter, js_name = "white")]
    pub fn set_white(this: &Theme, val: &str);

    #[wasm_bindgen(method, setter, js_name = "brightBlack")]
    pub fn set_bright_black(this: &Theme, val: &str);

    #[wasm_bindgen(method, setter, js_name = "brightRed")]
    pub fn set_bright_red(this: &Theme, val: &str);

    #[wasm_bindgen(method, setter, js_name = "brightGreen")]
    pub fn set_bright_green(this: &Theme, val: &str);

    #[wasm_bindgen(method, setter, js_name = "brightYellow")]
    pub fn set_bright_yellow(this: &Theme, val: &str);

    #[wasm_bindgen(method, setter, js_name = "brightBlue")]
    pub fn set_bright_blue(this: &Theme, val: &str);

    #[wasm_bindgen(method, setter, js_name = "brightMagenta")]
    pub fn set_bright_magenta(this: &Theme, val: &str);

    #[wasm_bindgen(method, setter, js_name = "brightCyan")]
    pub fn set_bright_cyan(this: &Theme, val: &str);

    #[wasm_bindgen(method, setter, js_name = "brightWhite")]
    pub fn set_bright_white(this: &Theme, val: &str);

    // ========================================================================

    #[wasm_bindgen(js_name = "ILinkMatcherOptions")]
    pub type LinkMatcherOptions;

    #[wasm_bindgen(method, setter, js_name = "matchIndex")]
    pub fn set_match_index(this: &LinkMatcherOptions, val: u32);

    #[wasm_bindgen(method, setter, js_name = "validationCallback")]
    pub fn set_validation_callback(this: &LinkMatcherOptions, val: &Function);
    // (uri: &str, callback: (is_valid: bool) => void) => void;

    #[wasm_bindgen(method, setter, js_name = "tooltipCallback")]
    pub fn set_tooltip_callback(this: &LinkMatcherOptions, val: &Function);
    // (event: MouseEvent, uri: &str, location: ViewportRange) => bool | void;

    #[wasm_bindgen(method, setter, js_name = "leaveCallback")]
    pub fn set_leave_callback(this: &LinkMatcherOptions, val: &Function);
    // () => void;

    #[wasm_bindgen(method, setter, js_name = "priority")]
    pub fn set_priority(this: &LinkMatcherOptions, val: u32);

    #[wasm_bindgen(method, setter, js_name = "willLinkActivate")]
    pub fn set_will_link_activate(this: &LinkMatcherOptions, val: &Function);
    // (event: MouseEvent, uri: &str) => bool;

    // ========================================================================

    #[wasm_bindgen(js_name = "IDisposable")]
    pub type Disposable;

    #[wasm_bindgen(method, js_name = "dispose")]
    pub fn dispose(this: &Disposable);

    // ========================================================================

    #[wasm_bindgen(js_name = "IEvent")]
    pub type Event;

    //   export interface Event<T, U = void> {
    //     (listener: (arg1: T, arg2: U) => any): Disposable;
    //   }

    // ========================================================================

    #[wasm_bindgen(extends = Disposable, js_name = "IMarker")]
    pub type Marker;

    #[wasm_bindgen(method, getter, js_name = "id")]
    pub fn get_id(this: &Marker) -> u32;

    #[wasm_bindgen(method, getter, js_name = "isDisposed")]
    pub fn get_is_disposed(this: &Marker) -> bool;

    #[wasm_bindgen(method, getter, js_name = "line")]
    pub fn get_line(this: &Marker) -> u32;

    // ========================================================================

    #[wasm_bindgen(js_name = "ILocalizableStrings")]
    pub type LocalizableStrings;

    #[wasm_bindgen(method, setter, js_name = "promptLabel")]
    pub fn set_prompt_label(this: &LocalizableStrings, val: &str);

    #[wasm_bindgen(method, setter, js_name = "tooMuchOutput")]
    pub fn set_too_much_output(this: &LocalizableStrings, val: &str);

    // ========================================================================

    #[wasm_bindgen(js_name = "IWindowOptions")]
    pub type WindowOptions;

    #[wasm_bindgen(method, setter, js_name = "restoreWin")]
    pub fn set_restore_win(this: &WindowOptions, val: bool);

    #[wasm_bindgen(method, setter, js_name = "minimizeWin")]
    pub fn set_minimize_win(this: &WindowOptions, val: bool);

    #[wasm_bindgen(method, setter, js_name = "setWinPosition")]
    pub fn set_win_position(this: &WindowOptions, val: bool);

    #[wasm_bindgen(method, setter, js_name = "setWinSizePixels")]
    pub fn set_win_size_pixels(this: &WindowOptions, val: bool);

    #[wasm_bindgen(method, setter, js_name = "raiseWin")]
    pub fn set_raise_win(this: &WindowOptions, val: bool);

    #[wasm_bindgen(method, setter, js_name = "lowerWin")]
    pub fn set_lower_win(this: &WindowOptions, val: bool);

    #[wasm_bindgen(method, setter, js_name = "refreshWin")]
    pub fn set_refresh_win(this: &WindowOptions, val: bool);

    #[wasm_bindgen(method, setter, js_name = "setWinSizeChars")]
    pub fn set_win_size_chars(this: &WindowOptions, val: bool);

    #[wasm_bindgen(method, setter, js_name = "maximizeWin")]
    pub fn set_maximize_win(this: &WindowOptions, val: bool);

    #[wasm_bindgen(method, setter, js_name = "fullscreenWin")]
    pub fn set_fullscreen_win(this: &WindowOptions, val: bool);

    #[wasm_bindgen(method, getter, js_name = "getWinState")]
    pub fn get_win_state(this: &WindowOptions) -> Option<bool>;

    #[wasm_bindgen(method, getter, js_name = "getWinPosition")]
    pub fn get_win_position(this: &WindowOptions) -> Option<bool>;

    #[wasm_bindgen(method, getter, js_name = "getWinSizePixels")]
    pub fn get_win_size_pixels(this: &WindowOptions) -> Option<bool>;

    #[wasm_bindgen(method, getter, js_name = "getScreenSizePixels")]
    pub fn get_screen_size_pixels(this: &WindowOptions) -> Option<bool>;

    #[wasm_bindgen(method, getter, js_name = "getCellSizePixels")]
    pub fn get_cell_size_pixels(this: &WindowOptions) -> Option<bool>;

    #[wasm_bindgen(method, getter, js_name = "getWinSizeChars")]
    pub fn get_win_size_chars(this: &WindowOptions) -> Option<bool>;

    #[wasm_bindgen(method, getter, js_name = "getScreenSizeChars")]
    pub fn get_screen_size_chars(this: &WindowOptions) -> Option<bool>;

    #[wasm_bindgen(method, getter, js_name = "getIconTitle")]
    pub fn get_icon_title(this: &WindowOptions) -> Option<bool>;

    #[wasm_bindgen(method, getter, js_name = "getWinTitle")]
    pub fn get_win_title(this: &WindowOptions) -> Option<bool>;

    #[wasm_bindgen(method, setter, js_name = "pushTitle")]
    pub fn set_push_title(this: &WindowOptions, val: bool);

    #[wasm_bindgen(method, setter, js_name = "popTitle")]
    pub fn set_pop_title(this: &WindowOptions, val: bool);

    #[wasm_bindgen(method, setter, js_name = "setWinLines")]
    pub fn set_win_lines(this: &WindowOptions, val: bool);

    // ========================================================================

    #[wasm_bindgen(extends = Disposable)]
    pub type Terminal;

    #[wasm_bindgen(constructor)]
    pub fn construct(options: Option<&TerminalOptions>) -> Terminal;

    #[wasm_bindgen(method, getter, js_name = "element")]
    pub fn get_element(this: &Terminal) -> HtmlElement;

    #[wasm_bindgen(method, getter, js_name = "textarea")]
    pub fn get_textarea(this: &Terminal) -> HtmlTextAreaElement;

    #[wasm_bindgen(method, getter, js_name = "rows")]
    pub fn get_rows(this: &Terminal) -> u32;

    #[wasm_bindgen(method, getter, js_name = "cols")]
    pub fn get_cols(this: &Terminal) -> u32;

    #[wasm_bindgen(method, getter, js_name = "buffer")]
    pub fn get_buffer(this: &Terminal) -> BufferNamespace;

    #[wasm_bindgen(method, getter, js_name = "markers")]
    pub fn get_markers(this: &Terminal) -> Box<[JsValue]>; // Box<[Marker]>

    #[wasm_bindgen(method, getter, js_name = "parser")]
    pub fn get_parser(this: &Terminal) -> Parser;

    #[wasm_bindgen(method, getter, js_name = "unicode")]
    pub fn get_unicode(this: &Terminal) -> UnicodeHandling;

    #[wasm_bindgen(static_method_of = Terminal, js_name = "strings")]
    pub fn get_strings() -> LocalizableStrings;

    // ========================================================================

    #[wasm_bindgen(method, js_name = "onBinary")]
    pub fn on_binary(
        this: &Terminal,
        f: &Function, // Event<&str>
    ) -> Disposable;

    //---------------

    #[wasm_bindgen(method, js_name = "onCursorMove")]
    pub fn on_cursor_move(
        this: &Terminal,
        f: &Function, // Event<void>
    ) -> Disposable;

    //---------------

    #[wasm_bindgen(method, js_name = "onData")]
    pub fn on_data(
        this: &Terminal,
        f: &Function, // Event<&str>
    ) -> Disposable;

    //---------------

    pub type OnKeyEvent;

    #[wasm_bindgen(method, getter, js_name = "key")]
    pub fn key(this: &OnKeyEvent) -> String;

    #[wasm_bindgen(method, getter, js_name = "domEvent")]
    pub fn dom_event(this: &OnKeyEvent) -> KeyboardEvent;

    #[wasm_bindgen(method, js_name = "onKey")]
    pub fn on_key(
        this: &Terminal,
        f: &Function, // Event<{key: &str, dom_event: KeyboardEvent}>
    ) -> Disposable;

    //---------------

    #[wasm_bindgen(method, js_name = "onLineFeed")]
    pub fn on_line_feed(
        this: &Terminal,
        f: &Function, // Event<void>
    ) -> Disposable;

    //---------------

    #[wasm_bindgen(method, js_name = "onScroll")]
    pub fn on_scroll(
        this: &Terminal,
        f: &Function, // Event<u32>
    ) -> Disposable;

    //---------------

    #[wasm_bindgen(method, js_name = "onSelectionChange")]
    pub fn on_selection_change(
        this: &Terminal,
        f: &Function, // Event<void>
    ) -> Disposable;

    //---------------

    pub type OnRenderEvent;

    #[wasm_bindgen(method, getter, js_name = "start")]
    pub fn start(this: &OnRenderEvent) -> u32;

    #[wasm_bindgen(method, getter, js_name = "end")]
    pub fn end(this: &OnRenderEvent) -> u32;

    #[wasm_bindgen(method, js_name = "onRender")]
    pub fn on_render(
        this: &Terminal,
        f: &Function, // Event<{start: u32, end: u32}>
    ) -> Disposable;

    //---------------

    #[wasm_bindgen(method, js_name = "onResize")]
    pub fn on_resize(
        this: &Terminal,
        f: &Function, // Event<{cols: u32, rows: u32}>
    ) -> Disposable;

    //---------------

    #[wasm_bindgen(method, js_name = "onTitleChange")]
    pub fn on_title_change(
        this: &Terminal,
        f: &Function, // Event<&str>
    ) -> Disposable;

    //---------------

    #[wasm_bindgen(method, js_name = "blur")]
    pub fn blur(this: &Terminal);

    #[wasm_bindgen(method, js_name = "focus")]
    pub fn focus(this: &Terminal);

    #[wasm_bindgen(method, js_name = "resize")]
    pub fn resize(this: &Terminal, columns: u32, rows: u32);

    #[wasm_bindgen(method, js_name = "open")]
    pub fn open(this: &Terminal, parent: HtmlElement);

    #[wasm_bindgen(method, js_name = "attachCustomKeyEventHandler")]
    pub fn attach_custom_key_event_handler(
        this: &Terminal,
        custom_key_event_handler: &Function, // (event: KeyboardEvent) => bool
    );

    #[wasm_bindgen(method, js_name = "registerLinkMatcher")]
    pub fn register_link_matcher(
        this: &Terminal,
        regex: RegExp,
        handler: &Function, // (event: MouseEvent, uri: &str) => void
        options: Option<LinkMatcherOptions>,
    ) -> u32;

    #[wasm_bindgen(method, js_name = "deregisterLinkMatcher")]
    pub fn deregister_link_matcher(this: &Terminal, matcher_id: u32);

    #[wasm_bindgen(method, js_name = "registerLinkProvider")]
    pub fn register_link_provider(this: &Terminal, link_provider: LinkProvider) -> Disposable;

    #[wasm_bindgen(method, js_name = "registerCharacterJoiner")]
    pub fn register_character_joiner(
        this: &Terminal,
        handler: &Function, // (text: &str) => [u32, u32][]
    ) -> u32;

    #[wasm_bindgen(method, js_name = "deregisterCharacterJoiner")]
    pub fn deregister_character_joiner(this: &Terminal, joiner_id: u32);

    #[wasm_bindgen(method, js_name = "registerMarker")]
    pub fn register_marker(this: &Terminal, cursorYOffset: u32) -> Option<Marker>;

    #[wasm_bindgen(method, js_name = "addMarker")]
    pub fn add_marker(this: &Terminal, cursorYOffset: u32) -> Option<Marker>;

    #[wasm_bindgen(method, js_name = "hasSelection")]
    pub fn has_selection(this: &Terminal) -> bool;

    #[wasm_bindgen(method, js_name = "getSelection")]
    pub fn get_selection(this: &Terminal) -> String;

    #[wasm_bindgen(method, js_name = "getSelectionPosition")]
    pub fn get_selection_position(this: &Terminal) -> Option<SelectionPosition>;

    #[wasm_bindgen(method, js_name = "clearSelection")]
    pub fn clear_selection(this: &Terminal);

    #[wasm_bindgen(method, js_name = "select")]
    pub fn select(this: &Terminal, column: u32, row: u32, length: u32);

    #[wasm_bindgen(method, js_name = "selectAll")]
    pub fn select_all(this: &Terminal);

    #[wasm_bindgen(method, js_name = "selectLines")]
    pub fn select_lines(this: &Terminal, start: u32, end: u32);

    #[wasm_bindgen(method, js_name = "dispose")]
    pub fn dispose(this: &Terminal);

    #[wasm_bindgen(method, js_name = "scrollLines")]
    pub fn scroll_lines(this: &Terminal, amount: u32);

    #[wasm_bindgen(method, js_name = "scrollPages")]
    pub fn scroll_pages(this: &Terminal, page_count: u32);

    #[wasm_bindgen(method, js_name = "scrollToTop")]
    pub fn scroll_to_top(this: &Terminal);

    #[wasm_bindgen(method, js_name = "scrollToBottom")]
    pub fn scroll_to_bottom(this: &Terminal);

    #[wasm_bindgen(method, js_name = "scrollToLine")]
    pub fn scroll_to_line(this: &Terminal, line: u32);

    #[wasm_bindgen(method, js_name = "clear")]
    pub fn clear(this: &Terminal);

    // ----------

    #[wasm_bindgen(method, js_name = "write")]
    pub fn write(this: &Terminal, data: &str);

    #[wasm_bindgen(method, js_name = "writeUtf8")]
    pub fn write_utf8(this: &Terminal, data: &[u8]);

    #[wasm_bindgen(method, js_name = "write")]
    pub fn write_callback(this: &Terminal, data: &str, callback: &Function); // () => void

    #[wasm_bindgen(method, js_name = "writeUtf8")]
    pub fn write_utf8_callback(this: &Terminal, data: &[u8], callback: &Function); // () => void

    // ----------

    #[wasm_bindgen(method, js_name = "writeln")]
    pub fn writeln(this: &Terminal, data: &str);

    #[wasm_bindgen(method, js_name = "writeln")]
    pub fn writeln_utf8(this: &Terminal, data: &[u8]);

    #[wasm_bindgen(method, js_name = "writeln")]
    pub fn writeln_with_callback(this: &Terminal, data: &str, callback: Option<&Function>); // () => void

    #[wasm_bindgen(method, js_name = "writeln")]
    pub fn writeln_utf8_with_callback(this: &Terminal, data: &[u8], callback: Option<&Function>); // () => void

    // ----------

    #[wasm_bindgen(method, js_name = "paste")]
    pub fn paste(this: &Terminal, data: &str);

    #[wasm_bindgen(method, js_name = "getOption")]
    pub fn get_string_option(this: &Terminal, key: StringOptionKey) -> String;

    #[wasm_bindgen(method, js_name = "getOption")]
    pub fn get_bool_option(this: &Terminal, key: BoolOptionKey) -> bool;

    #[wasm_bindgen(method, js_name = "getOption")]
    pub fn get_number_option(this: &Terminal, key: NumberOptionKey) -> u32;

    #[wasm_bindgen(method, js_name = "getOption")]
    pub fn get_any_option(this: &Terminal, key: &str) -> JsValue;

    #[wasm_bindgen(method, js_name = "setOption")]
    pub fn set_string_option(this: &Terminal, key: StringOptionKey, value: &str);

    #[wasm_bindgen(method, js_name = "setOption")]
    pub fn set_font_option(this: &Terminal, key: FontWeightKey, value: FontWeight);

    #[wasm_bindgen(method, js_name = "setOption")]
    pub fn set_log_level_option(this: &Terminal, key: LogLevelKey, value: LogLevel);

    #[wasm_bindgen(method, js_name = "setOption")]
    pub fn set_bell_style_option(this: &Terminal, key: BellStyleKey, value: BellStyle);

    #[wasm_bindgen(method, js_name = "setOption")]
    pub fn set_cursor_option(this: &Terminal, key: CursorStyleKey, value: CursorStyle);

    #[wasm_bindgen(method, js_name = "setOption")]
    pub fn set_bool_option(this: &Terminal, key: BoolOptionKey, value: bool);

    #[wasm_bindgen(method, js_name = "setOption")]
    pub fn set_number_option(this: &Terminal, key: NumberOptionKey, value: u32);

    #[wasm_bindgen(method, js_name = "setOption")]
    pub fn set_theme_option(this: &Terminal, key: ThemeKey, value: Theme);

    #[wasm_bindgen(method, js_name = "setOption")]
    pub fn set_any_option(this: &Terminal, key: &str, value: JsValue);

    #[wasm_bindgen(method, js_name = "refresh")]
    pub fn refresh(this: &Terminal, start: u32, end: u32);

    #[wasm_bindgen(method, js_name = "reset")]
    pub fn reset(this: &Terminal);

    #[wasm_bindgen(method, js_name = "loadAddon")]
    pub fn load_addon(this: &Terminal, addon: TerminalAddon);

    // ========================================================================

    #[wasm_bindgen(extends = Disposable, js_name = "ITerminalAddon")]
    pub type TerminalAddon;

    #[wasm_bindgen(method)]
    pub fn activate(this: &TerminalAddon, terminal: Terminal);

    // ========================================================================

    #[wasm_bindgen(js_name = "ISelectionPosition")]
    pub type SelectionPosition;

    #[wasm_bindgen(method, getter, js_name = "startColumn")]
    pub fn start_column(this: &SelectionPosition) -> u32;

    #[wasm_bindgen(method, getter, js_name = "startRow")]
    pub fn start_row(this: &SelectionPosition) -> u32;

    #[wasm_bindgen(method, getter, js_name = "endColumn")]
    pub fn end_column(this: &SelectionPosition) -> u32;

    #[wasm_bindgen(method, getter, js_name = "endRow")]
    pub fn end_row(this: &SelectionPosition) -> u32;

    // ========================================================================

    #[wasm_bindgen(js_name = "IViewportRange")]
    pub type ViewportRange;

    #[wasm_bindgen(method, getter, js_name = "start")]
    pub fn get_start(this: &ViewportRange) -> ViewportRangePosition;

    #[wasm_bindgen(method, getter, js_name = "end")]
    pub fn get_end(this: &ViewportRange) -> ViewportRangePosition;

    #[wasm_bindgen(method, setter, js_name = "start")]
    pub fn set_start(this: &ViewportRange, val: &ViewportRangePosition);

    #[wasm_bindgen(method, setter, js_name = "end")]
    pub fn set_end(this: &ViewportRange, val: &ViewportRangePosition);

    // ========================================================================

    #[wasm_bindgen(js_name = "IViewportRangePosition")]
    pub type ViewportRangePosition;

    #[wasm_bindgen(method, setter, js_name = "x")]
    pub fn set_x(this: &ViewportRangePosition, val: u32);

    #[wasm_bindgen(method, setter, js_name = "y")]
    pub fn set_y(this: &ViewportRangePosition, val: u32);

    // ========================================================================

    #[wasm_bindgen(js_name = "ILinkProvider")]
    pub type LinkProvider;

    #[wasm_bindgen(method, js_name = "provideLinks")]
    pub fn provide_links(
        this: &LinkProvider,
        buffer_lineu32: u32,
        callback: &Function, // (links: Link[] | undefined) => void
    );

    // ========================================================================

    #[wasm_bindgen(js_name = "ILink")]
    pub type Link;

    #[wasm_bindgen(method, setter, js_name = "range")]
    pub fn set_range(this: &Link, val: &BufferRange);

    #[wasm_bindgen(method, setter, js_name = "text")]
    pub fn set_text(this: &Link, val: &str);

    #[wasm_bindgen(method, setter, js_name = "decorations")]
    pub fn set_decorations(this: &Link, val: &LinkDecorations);

    #[wasm_bindgen(method, js_name = "activate")]
    pub fn activate(this: &Link, event: MouseEvent, text: &str);

    #[wasm_bindgen(method, js_name = "hover")]
    pub fn hover(this: &Link, event: MouseEvent, text: &str);

    #[wasm_bindgen(method, js_name = "leave")]
    pub fn leave(this: &Link, event: MouseEvent, text: &str);

    // ========================================================================

    #[wasm_bindgen(js_name = "ILinkDecorations")]
    pub type LinkDecorations;

    #[wasm_bindgen(method, setter, js_name = "pointerCursor")]
    pub fn set_pointer_cursor(this: &BufferNamespace, val: bool);

    #[wasm_bindgen(method, setter, js_name = "underline")]
    pub fn set_underline(this: &BufferNamespace, val: bool);

    // ========================================================================

    #[wasm_bindgen(js_name = "IBufferRange")]
    pub type BufferRange;

    #[wasm_bindgen(method, getter, js_name = "start")]
    pub fn get_start(this: &BufferRange) -> BufferCellPosition;

    #[wasm_bindgen(method, getter, js_name = "end")]
    pub fn get_end(this: &BufferRange) -> BufferCellPosition;

    // ========================================================================

    #[wasm_bindgen(js_name = "IBufferCellPosition")]
    pub type BufferCellPosition;

    #[wasm_bindgen(method, getter, js_name = "x")]
    pub fn get_x(this: &BufferCellPosition) -> u32;

    #[wasm_bindgen(method, getter, js_name = "y")]
    pub fn get_y(this: &BufferCellPosition) -> u32;

    // ========================================================================

    #[wasm_bindgen(js_name = "IBuffer")]
    pub type Buffer;

    #[wasm_bindgen(method, getter, js_name = "type")]
    pub fn get_type(this: &Buffer) -> BufferType;

    #[wasm_bindgen(method, getter, js_name = "cursorY")]
    pub fn get_cursor_y(this: &Buffer) -> u32;

    #[wasm_bindgen(method, getter, js_name = "cursorX")]
    pub fn get_cursor_x(this: &Buffer) -> u32;

    #[wasm_bindgen(method, getter, js_name = "viewportY")]
    pub fn get_viewport_y(this: &Buffer) -> u32;

    #[wasm_bindgen(method, getter, js_name = "baseY")]
    pub fn get_base_y(this: &Buffer) -> u32;

    #[wasm_bindgen(method, getter, js_name = "length")]
    pub fn get_length(this: &Buffer) -> u32;

    #[wasm_bindgen(method, js_name = "getLine")]
    pub fn get_line(this: &Buffer, y: u32) -> BufferLine;

    #[wasm_bindgen(method, js_name = "getNullCell")]
    pub fn get_null_cell(this: &Buffer) -> BufferCell;

    // ========================================================================

    #[wasm_bindgen(js_name = "IBufferNamespace")]
    pub type BufferNamespace;

    #[wasm_bindgen(method, getter, js_name = "active")]
    pub fn get_active(this: &BufferNamespace) -> Buffer;

    #[wasm_bindgen(method, getter, js_name = "normal")]
    pub fn get_normal(this: &BufferNamespace) -> Buffer;

    #[wasm_bindgen(method, getter, js_name = "alternate")]
    pub fn get_alternate(this: &BufferNamespace) -> Buffer;

    #[wasm_bindgen(method, setter, js_name = "onBufferChange")]
    pub fn set_on_buffer_change(this: &BufferNamespace, val: &Function);

    // ========================================================================

    #[wasm_bindgen(js_name = "IBufferLine")]
    pub type BufferLine;

    #[wasm_bindgen(method, getter, js_name = "isWrapped")]
    pub fn is_wrapped(this: &BufferLine) -> bool;

    #[wasm_bindgen(method, getter, js_name = "length")]
    pub fn get_length(this: &BufferLine) -> u32;

    #[wasm_bindgen(method, js_name = "getCell")]
    pub fn get_cell(this: &BufferLine, x: u32, cell: Option<BufferCell>) -> Option<BufferCell>;

    #[wasm_bindgen(method, js_name = "translateToString")]
    pub fn translate_to_String(
        this: &BufferLine,
        trim_right: bool,
        start_column: Option<u32>,
        end_column: Option<u32>,
    ) -> String;

    // ========================================================================

    #[wasm_bindgen(js_name = "IBufferCell")]
    pub type BufferCell;

    #[wasm_bindgen(method, js_name = "getWidth")]
    pub fn get_width(this: &BufferCell) -> u32;

    #[wasm_bindgen(method, js_name = "getChars")]
    pub fn get_chars(this: &BufferCell) -> String;

    #[wasm_bindgen(method, js_name = "getCode")]
    pub fn get_code(this: &BufferCell) -> u32;

    #[wasm_bindgen(method, js_name = "getFgColorMode")]
    pub fn get_fg_color_mode(this: &BufferCell) -> u32;

    #[wasm_bindgen(method, js_name = "getBgColorMode")]
    pub fn get_bg_color_mode(this: &BufferCell) -> u32;

    #[wasm_bindgen(method, js_name = "getFgColor")]
    pub fn get_fg_color(this: &BufferCell) -> u32;

    #[wasm_bindgen(method, js_name = "getBgColor")]
    pub fn bg_color(this: &BufferCell) -> u32;

    #[wasm_bindgen(method, js_name = "isBold")]
    pub fn is_bold(this: &BufferCell) -> u32;

    #[wasm_bindgen(method, js_name = "isItalic")]
    pub fn is_italic(this: &BufferCell) -> u32;

    #[wasm_bindgen(method, js_name = "isDim")]
    pub fn is_dim(this: &BufferCell) -> u32;

    #[wasm_bindgen(method, js_name = "isUnderline")]
    pub fn is_underline(this: &BufferCell) -> u32;

    #[wasm_bindgen(method, js_name = "isBlink")]
    pub fn is_blink(this: &BufferCell) -> u32;

    #[wasm_bindgen(method, js_name = "isInverse")]
    pub fn is_inverse(this: &BufferCell) -> u32;

    #[wasm_bindgen(method, js_name = "isInvisible")]
    pub fn is_invisible(this: &BufferCell) -> u32;

    #[wasm_bindgen(method, js_name = "isFgRGB")]
    pub fn is_fg_rgb(this: &BufferCell) -> bool;

    #[wasm_bindgen(method, js_name = "isBgRGB")]
    pub fn is_bg_rgb(this: &BufferCell) -> bool;

    #[wasm_bindgen(method, js_name = "isFgPalette")]
    pub fn is_fg_palette(this: &BufferCell) -> bool;

    #[wasm_bindgen(method, js_name = "isBgPalette")]
    pub fn is_bg_palette(this: &BufferCell) -> bool;

    #[wasm_bindgen(method, js_name = "isFgDefault")]
    pub fn is_fg_default(this: &BufferCell) -> bool;

    #[wasm_bindgen(method, js_name = "isBgDefault")]
    pub fn is_bg_default(this: &BufferCell) -> bool;

    #[wasm_bindgen(method, js_name = "isAttributeDefault")]
    pub fn is_attribute_default(this: &BufferCell) -> bool;

    // ========================================================================

    #[wasm_bindgen(js_name = "IFunctionIdentifier")]
    pub type FunctionIdentifier;

    #[wasm_bindgen(method, setter, js_name = "prefix")]
    pub fn set_prefix(this: &FunctionIdentifier, val: &str);

    #[wasm_bindgen(method, setter, js_name = "intermediates")]
    pub fn set_intermediates(this: &FunctionIdentifier, val: &str);

    #[wasm_bindgen(method, setter, js_name = "final")]
    pub fn set_final(this: &FunctionIdentifier, val: &str);

    // ========================================================================

    #[wasm_bindgen(js_name = "IParser")]
    pub type Parser;

    #[wasm_bindgen(method, js_name = "registerCsiHandler")]
    pub fn register_csi_handler(
        this: &FunctionIdentifier,
        id: FunctionIdentifier,
        callback: &Function, // (params: (u32 | u32[])[]) => bool
    ) -> Disposable;

    #[wasm_bindgen(method, js_name = "registerDcsHandler")]
    pub fn register_dcs_handler(
        this: &FunctionIdentifier,
        id: FunctionIdentifier,
        callback: &Function, // (data: &str, param: (u32 | u32[])[]) => bool
    ) -> Disposable;

    #[wasm_bindgen(method, js_name = "registerEscHandler")]
    pub fn register_esc_handler(
        this: &FunctionIdentifier,
        id: FunctionIdentifier,
        handler: &Function, // () => bool
    ) -> Disposable;

    #[wasm_bindgen(method, js_name = "registerOscHandler")]
    pub fn register_osc_handler(
        this: &FunctionIdentifier,
        ident: u32,
        callback: &Function, // (data: &str) => bool
    ) -> Disposable;

    // ========================================================================

    #[wasm_bindgen(js_name = "IUnicodeVersionProvider")]
    pub type UnicodeVersionProvider;

    #[wasm_bindgen(method, getter, js_name = "version")]
    pub fn get_version(this: &UnicodeVersionProvider) -> String;

    #[wasm_bindgen(method, js_name = "wcwidth")]
    pub fn wcwidth(this: &ViewportRangePosition, codepoint: u32) -> WcWidth;

    // ========================================================================

    #[wasm_bindgen(js_name = "IUnicodeHandling")]
    pub type UnicodeHandling;

    #[wasm_bindgen(method, js_name = "register")]
    pub fn register(this: &UnicodeHandling, provider: UnicodeVersionProvider);

    #[wasm_bindgen(method, getter, js_name = "versions")]
    pub fn get_versions(this: &UnicodeHandling) -> Box<[JsValue]>; // Box<[&str]>

    #[wasm_bindgen(method, getter, js_name = "activeVersion")]
    pub fn get_active_version(this: &UnicodeHandling) -> String;

}
