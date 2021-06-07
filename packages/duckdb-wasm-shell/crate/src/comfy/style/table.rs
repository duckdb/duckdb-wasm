use strum_macros::EnumIter;

/// Specify how comfy_table should arrange the content in your table.
#[derive(Clone, Debug)]
pub enum ContentArrangement {
    /// Don't do any content arrangement.\
    /// Tables with this mode might become wider than your output and look ugly.\
    /// Constraints on columns are still respected.
    Disabled,
    /// Dynamically determine the width of columns in regard to terminal width and content length.\
    /// With this mode, the content in cells will wrap dynamically to get the  the best column layout
    /// for the given content.\
    /// Constraints on columns are still respected.
    ///
    /// **Warning:** If terminal width cannot be determined and no table_width is set via
    /// [Table::set_table_width](crate::table::Table::set_table_width),
    /// this option won't work and [Disabled](ContentArrangement::Disabled) will be used as a fallback.
    Dynamic,
    /// This is mode is the same as the [ContentArrangement::Dynamic] arrangement, but it will always use as much
    /// space as it's given. Any surplus space will be distributed between all columns.
    DynamicFullWidth,
    // /// Same as [ContentArrangement::Dynamic], but the full width of the terminal will always be used.
    // /// Use this, if you want tables to use as much space as possible.
    // /// Constraints on columns are still respected.
    // Full,
}

/// All configurable table components.
/// A character can be assigned to each component via [Table::set_style](crate::table::Table::set_style).
/// This is then used to draw character of the respective component to the commandline.
///
/// I hope that most component names are self-explanatory. Just in case:
/// BorderIntersections are Intersections, where rows/columns lines meet outer borders.
/// E.g.:
/// ```text
///        ---------
///        v       |
/// +---+---+---+  |
/// | a | b | c |  |
/// +===+===+===+<-|
/// |   |   |   |  |
/// +---+---+---+<-- These "+" chars are Borderintersections.
/// |   |   |   |    The inner "+" chars are MiddleIntersections
/// +---+---+---+
/// ```
#[derive(Debug, PartialEq, Eq, Hash, EnumIter)]
pub enum TableComponent {
    LeftBorder,
    RightBorder,
    TopBorder,
    BottomBorder,
    LeftHeaderIntersection,
    HeaderLines,
    MiddleHeaderIntersections,
    RightHeaderIntersection,
    VerticalLines,
    HorizontalLines,
    MiddleIntersections,
    LeftBorderIntersections,
    RightBorderIntersections,
    TopBorderIntersections,
    BottomBorderIntersections,
    TopLeftCorner,
    TopRightCorner,
    BottomLeftCorner,
    BottomRightCorner,
}
