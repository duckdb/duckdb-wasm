/// This module provides styling presets for tables.\
/// Every preset has an example preview.
pub mod presets;

/// Contains modifiers, that can be used to alter certain parts of a preset.\
/// For instance, the [UTF8_ROUND_CORNERS](modifiers::UTF8_ROUND_CORNERS) replaces all corners with round UTF8 box corners.
pub mod modifiers;

mod table;

mod cell;

mod column;

pub use cell::CellAlignment;
pub use column::ColumnConstraint;
pub use table::{ContentArrangement, TableComponent};

#[derive(Copy, Clone, Debug, PartialEq, Eq, Ord, PartialOrd)]
pub enum Attribute {
    /// All attributes off
    /// [info]: This will reset all current set attributes.
    /// [Supportability]: Windows, UNIX.
    Reset = 0,
    /// Increased Intensity
    /// [info]: This will increase the font sensitivity also known as bold.
    /// [Supportability]: Windows, UNIX.
    Bold = 1,
    /// Decreased Intensity
    /// [info]: This will decrease the font sensitivity also known as bold.
    /// [Supportability]: Windows, UNIX.
    Dim = 2,
    /// Italic Text
    /// [info]: This will make the font italic.
    /// [Supportability]: Not widely supported, sometimes treated as inverse.
    Italic = 3,
    /// This will draw a line under the font.
    /// [info]: An line under a word, especially in order to show its importance.
    /// [Supportability]: Windows, UNIX
    Underlined = 4,
    /// Slow Blinking Text
    /// [info]: Blink Less than 150 per minute.
    /// [Supportability]: UNIX
    SlowBlink = 5,
    /// Slow Blinking Text
    /// [info]: MS-DOS ANSI.SYS; 150+ per minute;
    /// [Supportability]: Not widely supported
    RapidBlink = 6,
    /// Swap foreground and background colors
    /// [info]: swap foreground and background colors
    /// [Supportability]: Windows, UNIX
    Reverse = 7,
    /// Hide font
    /// [info]:
    /// - This will make the font hidden.
    /// - Also known as 'Conceal'
    /// [Supportability]: Windows, UNIX
    Hidden = 8,
    /// Cross-out font
    /// [info]: Characters legible, but marked for deletion.
    /// [Supportability]: UNIX
    CrossedOut = 9,
    /// The Fraktur is a typeface belonging to the group of Gothic typefaces.
    /// [info]: https://nl.wikipedia.org/wiki/Fraktur
    /// [Supportability]: Rarely supported
    Fraktur = 20,
    /// This will turn off the bold attribute.
    /// [info]:
    /// - Double-underline per ECMA-48.
    /// - WikiPedia: https://en.wikipedia.org/wiki/Talk:ANSI_escape_code#SGR_21%E2%80%94%60Bold_off%60_not_widely_supported
    /// - Opposite of `Bold`(1)
    /// [Supportability]: not widely supported
    NoBold = 21,
    /// This will turn off the italic attribute.
    /// [info]:
    /// - Not italic, not Fraktur
    /// - Opposite of `Italic`(3)
    /// [Supportability]: Windows, UNIX
    NoItalic = 23,
    /// This will turn off the underline attribute.
    /// [info]:
    /// - Not singly or doubly underlined will be turned off.
    /// - Opposite of `Underlined.`(4)
    /// [Supportability]: Windows, UNIX
    NoUnderline = 24,
    /// This will turn off the blinking attribute
    /// [info]: Opposite of `Slow and Rapid blink.`(5,6)
    /// [Supportability]: Unknown
    NoBlink = 25,
    /// This will turn off the reverse attribute.
    /// [info]: Opposite of `Reverse`(7)
    /// [Supportability]: Windows, unknown
    NoInverse = 27,
    /// This will make the font visible.
    /// [info]: Opposite of `Hidden`(8)
    /// [Supportability]: Unknown
    NoHidden = 28,
    /// This will turn off the crossed out attribute.
    /// [info]: Opposite of `CrossedOut`(9)
    /// [Supportability]: Not widely supported
    NotCrossedOut = 29,
    /// This will reset the foreground color to default.
    /// [info]: Implementation defined (according to standard)
    /// [Supportability]: Unknown
    DefaultForegroundColor = 48,
    /// This will reset the background color to default.
    /// [info]: Implementation defined (according to standard)
    /// [Supportability]: Unknown
    DefaultBackgroundColor = 49,
    /// Framed font.
    /// [Supportability]: Not widely supported
    Framed = 51,
    /// This will turn on the encircled attribute.
    Encircled = 52,
    /// This will draw a line at the top of the font.
    /// [info]: Implementation defined (according to standard)
    /// [Supportability]: Unknown
    OverLined = 53,
    /// This will turn off the framed or encircled attribute.
    NotFramedOrEncircled = 54,
    /// This will turn off the overLined attribute.
    /// [info]: Opposite of `OverLined`(7)
    /// [Supportability]: Windows, unknown
    NotOverLined = 55,

    #[doc(hidden)]
    __Nonexhaustive,
}

/// Colors that are available for coloring the terminal font.
#[derive(Debug, Copy, Clone)]
pub enum Color {
    Black,

    Red,
    DarkRed,

    Green,
    DarkGreen,

    Yellow,
    DarkYellow,

    Blue,
    DarkBlue,

    Magenta,
    DarkMagenta,

    Cyan,
    DarkCyan,

    Grey,
    White,
    /// Color representing RGB-colors;
    /// r = red
    /// g = green
    /// b = blue
    Rgb {
        r: u8,
        g: u8,
        b: u8,
    },
    AnsiValue(u8),
}
