// Builder patterns for all options
use super::super::*;
use js_sys::Function;

// Generate builder pattern:
// '<,'>s/\(.*\)set_\(.*\)(.*,\(.*\));/\1with_\2(\&self,\3) -> \&Self \{ self.set_\2(val); self \}/

impl TerminalOptions {
    pub fn with_transparency(&self, val: bool) -> &Self {
        self.set_allow_transparency(val);
        self
    }

    pub fn with_bell_sound(&self, val: &str) -> &Self {
        self.set_bell_sound(val);
        self
    }

    pub fn with_bell_style(&self, val: BellStyle) -> &Self {
        self.set_bell_style(val);
        self
    }

    pub fn with_convert_eol(&self, val: bool) -> &Self {
        self.set_convert_eol(val);
        self
    }

    pub fn with_cols(&self, val: u32) -> &Self {
        self.set_cols(val);
        self
    }

    pub fn with_cursor_blink(&self, val: bool) -> &Self {
        self.set_cursor_blink(val);
        self
    }

    pub fn with_cursor_style(&self, val: CursorStyle) -> &Self {
        self.set_cursor_style(val);
        self
    }

    pub fn with_cursor_width(&self, val: u32) -> &Self {
        self.set_cursor_width(val);
        self
    }

    pub fn with_disable_stdin(&self, val: bool) -> &Self {
        self.set_disable_stdin(val);
        self
    }

    pub fn with_draw_bold_text_in_bright_colors(&self, val: bool) -> &Self {
        self.set_draw_bold_text_in_bright_colors(val);
        self
    }

    pub fn with_fast_scroll_modifier(&self, val: FastScrollModifier) -> &Self {
        self.set_fast_scroll_modifier(val);
        self
    }

    pub fn with_fast_scroll_sensitivity(&self, val: u32) -> &Self {
        self.set_fast_scroll_sensitivity(val);
        self
    }

    pub fn with_font_size(&self, val: u32) -> &Self {
        self.set_font_size(val);
        self
    }

    pub fn with_font_family(&self, val: &str) -> &Self {
        self.set_font_family(val);
        self
    }

    pub fn with_font_weight(&self, val: FontWeight) -> &Self {
        self.set_font_weight(val);
        self
    }

    pub fn with_font_weight_bold(&self, val: FontWeight) -> &Self {
        self.set_font_weight_bold(val);
        self
    }

    pub fn with_letter_spacing(&self, val: u32) -> &Self {
        self.set_letter_spacing(val);
        self
    }

    pub fn with_line_height(&self, val: u32) -> &Self {
        self.set_line_height(val);
        self
    }

    pub fn with_link_tooltip_hover_duration(&self, val: u32) -> &Self {
        self.set_link_tooltip_hover_duration(val);
        self
    }

    pub fn with_log_level(&self, val: LogLevel) -> &Self {
        self.set_log_level(val);
        self
    }

    pub fn with_mac_option_is_meta(&self, val: bool) -> &Self {
        self.set_mac_option_is_meta(val);
        self
    }

    pub fn with_mac_option_click_forces_selection(&self, val: bool) -> &Self {
        self.set_mac_option_click_forces_selection(val);
        self
    }

    pub fn with_minimum_contrast_ratio(&self, val: u32) -> &Self {
        self.set_minimum_contrast_ratio(val);
        self
    }

    pub fn with_renderer_type(&self, val: RendererType) -> &Self {
        self.set_renderer_type(val);
        self
    }

    pub fn with_right_click_selects_word(&self, val: bool) -> &Self {
        self.set_right_click_selects_word(val);
        self
    }

    pub fn with_rows(&self, val: u32) -> &Self {
        self.set_rows(val);
        self
    }

    pub fn with_screen_reader_mode(&self, val: bool) -> &Self {
        self.set_screen_reader_mode(val);
        self
    }

    pub fn with_scrollback(&self, val: u32) -> &Self {
        self.set_scrollback(val);
        self
    }

    pub fn with_scroll_sensitivity(&self, val: u32) -> &Self {
        self.set_scroll_sensitivity(val);
        self
    }

    pub fn with_tab_stop_width(&self, val: u32) -> &Self {
        self.set_tab_stop_width(val);
        self
    }

    pub fn with_theme(&self, val: &Theme) -> &Self {
        self.set_theme(val);
        self
    }

    pub fn with_windows_mode(&self, val: bool) -> &Self {
        self.set_windows_mode(val);
        self
    }

    pub fn with_word_separator(&self, val: &str) -> &Self {
        self.set_word_separator(val);
        self
    }

    pub fn with_window_options(&self, val: &WindowOptions) -> &Self {
        self.set_window_options(val);
        self
    }
}

impl Theme {
    pub fn with_foreground(&self, val: &str) -> &Self {
        self.set_foreground(val);
        self
    }

    pub fn with_background(&self, val: &str) -> &Self {
        self.set_background(val);
        self
    }

    pub fn with_cursor(&self, val: &str) -> &Self {
        self.set_cursor(val);
        self
    }

    pub fn with_cursor_accent(&self, val: &str) -> &Self {
        self.set_cursor_accent(val);
        self
    }

    pub fn with_selection(&self, val: &str) -> &Self {
        self.set_selection(val);
        self
    }

    pub fn with_black(&self, val: &str) -> &Self {
        self.set_black(val);
        self
    }

    pub fn with_red(&self, val: &str) -> &Self {
        self.set_red(val);
        self
    }

    pub fn with_green(&self, val: &str) -> &Self {
        self.set_green(val);
        self
    }

    pub fn with_yellow(&self, val: &str) -> &Self {
        self.set_yellow(val);
        self
    }

    pub fn with_blue(&self, val: &str) -> &Self {
        self.set_blue(val);
        self
    }

    pub fn with_magenta(&self, val: &str) -> &Self {
        self.set_magenta(val);
        self
    }

    pub fn with_cyan(&self, val: &str) -> &Self {
        self.set_cyan(val);
        self
    }

    pub fn with_white(&self, val: &str) -> &Self {
        self.set_white(val);
        self
    }

    pub fn with_bright_black(&self, val: &str) -> &Self {
        self.set_bright_black(val);
        self
    }

    pub fn with_bright_red(&self, val: &str) -> &Self {
        self.set_bright_red(val);
        self
    }

    pub fn with_bright_green(&self, val: &str) -> &Self {
        self.set_bright_green(val);
        self
    }

    pub fn with_bright_yellow(&self, val: &str) -> &Self {
        self.set_bright_yellow(val);
        self
    }

    pub fn with_bright_blue(&self, val: &str) -> &Self {
        self.set_bright_blue(val);
        self
    }

    pub fn with_bright_magenta(&self, val: &str) -> &Self {
        self.set_bright_magenta(val);
        self
    }

    pub fn with_bright_cyan(&self, val: &str) -> &Self {
        self.set_bright_cyan(val);
        self
    }

    pub fn with_bright_white(&self, val: &str) -> &Self {
        self.set_bright_white(val);
        self
    }
}

impl LinkMatcherOptions {
    pub fn with_match_index(&self, val: u32) -> &Self {
        self.set_match_index(val);
        self
    }

    pub fn with_validation_callback(&self, val: &Function) -> &Self {
        self.set_validation_callback(val);
        self
    }

    pub fn with_tooltip_callback(&self, val: &Function) -> &Self {
        self.set_tooltip_callback(val);
        self
    }

    pub fn with_leave_callback(&self, val: &Function) -> &Self {
        self.set_leave_callback(val);
        self
    }

    pub fn with_priority(&self, val: u32) -> &Self {
        self.set_priority(val);
        self
    }

    pub fn with_will_link_activate(&self, val: &Function) -> &Self {
        self.set_will_link_activate(val);
        self
    }
}

impl WindowOptions {
    pub fn with_restore_win(&self, val: bool) -> &Self {
        self.set_restore_win(val);
        self
    }

    pub fn with_minimize_win(&self, val: bool) -> &Self {
        self.set_minimize_win(val);
        self
    }

    pub fn with_win_position(&self, val: bool) -> &Self {
        self.set_win_position(val);
        self
    }

    pub fn with_win_size_pixels(&self, val: bool) -> &Self {
        self.set_win_size_pixels(val);
        self
    }

    pub fn with_raise_win(&self, val: bool) -> &Self {
        self.set_raise_win(val);
        self
    }

    pub fn with_lower_win(&self, val: bool) -> &Self {
        self.set_lower_win(val);
        self
    }

    pub fn with_refresh_win(&self, val: bool) -> &Self {
        self.set_refresh_win(val);
        self
    }

    pub fn with_win_size_chars(&self, val: bool) -> &Self {
        self.set_win_size_chars(val);
        self
    }

    pub fn with_maximize_win(&self, val: bool) -> &Self {
        self.set_maximize_win(val);
        self
    }

    pub fn with_fullscreen_win(&self, val: bool) -> &Self {
        self.set_fullscreen_win(val);
        self
    }

    pub fn with_push_title(&self, val: bool) -> &Self {
        self.set_push_title(val);
        self
    }

    pub fn with_pop_title(&self, val: bool) -> &Self {
        self.set_pop_title(val);
        self
    }

    pub fn with_win_lines(&self, val: bool) -> &Self {
        self.set_win_lines(val);
        self
    }
}
