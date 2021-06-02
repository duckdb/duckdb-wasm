use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub enum BellStyle {
    None = "none",
    Sound = "sound",
    Visual = "visual",
    Both = "both",
}

#[wasm_bindgen]
pub enum CursorStyle {
    Block = "block",
    Underline = "underline",
    Bar = "bar",
}

#[wasm_bindgen]
pub enum FastScrollModifier {
    Alt = "alt",
    Ctrl = "ctrl",
    Shift = "shift",
}

#[wasm_bindgen]
pub enum FontWeight {
    Normal = "normal",
    Bold = "bold",
    W100 = "100",
    W200 = "200",
    W300 = "300",
    W400 = "400",
    W500 = "500",
    W600 = "600",
    W700 = "700",
    W800 = "800",
    W900 = "900",
}

#[wasm_bindgen]
pub enum LogLevel {
    Debug = "debug",
    Info = "info",
    Warn = "warn",
    Error = "error",
    Off = "off",
}

#[wasm_bindgen]
pub enum RendererType {
    Dom = "dom",
    Canvas = "canvas",
}

#[wasm_bindgen]
pub enum BufferType {
    Normal = "normal",
    Alternate = "alternate",
}

#[wasm_bindgen]
pub enum WcWidth {
    Width0 = 0,
    Width1 = 1,
    Width2 = 2,
}

#[wasm_bindgen]
pub enum StringOptionKey {
    BellSound = "bellSound",
    BellStyle = "bellStyle",
    CursorStyle = "cursorStyle",
    FontFamily = "fontFamily",
    FontWeight = "fontWeight",
    FontWeightBold = "fontWeightBold",
    LogLevel = "logLevel",
    RendererType = "rendererType",
    TermName = "termName",
    WordSeparator = "wordSeparator",
}

#[wasm_bindgen]
pub enum BoolOptionKey {
    AllowTransparency = "allowTransparency",
    CancelEvents = "cancelEvents",
    ConvertEol = "convertEol",
    CursorBlink = "cursorBlink",
    DisableStdin = "disableStdin",
    MacOptionIsMeta = "macOptionIsMeta",
    RightClickSelectsWord = "rightClickSelectsWord",
    PopOnBell = "popOnBell",
    VisualBell = "visualBell",
    WindowsMode = "windowsMode",
}

#[wasm_bindgen]
pub enum NumberOptionKey {
    Cols = "cols",
    FontSize = "fontSize",
    LetterSpacing = "letterSpacing",
    LineHeight = "lineHeight",
    Rows = "rows",
    TabStopWidth = "tabStopWidth",
    Scrollback = "scrollback",
}

#[wasm_bindgen]
pub enum FontWeightKey {
    FontWeight = "fontWeight",
    FontWeightBold = "fontWeightBold",
}

#[wasm_bindgen]
pub enum LogLevelKey {
    LogLevel = "logLevel",
}

#[wasm_bindgen]
pub enum BellStyleKey {
    BellStyle = "bellStyle",
}

#[wasm_bindgen]
pub enum CursorStyleKey {
    CursorStyle = "cursorStyle",
}

#[wasm_bindgen]
pub enum ThemeKey {
    Theme = "theme",
}
