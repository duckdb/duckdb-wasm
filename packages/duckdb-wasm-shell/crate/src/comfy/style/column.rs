/// Constraints can be added to [columns](crate::Column).
///
/// They allow some control over the dynamic content arrangement process.
#[derive(Copy, Clone, Debug, PartialEq)]
pub enum ColumnConstraint {
    /// This will completely hide a column.
    Hidden,
    /// Force the column to be as long as it's content.
    /// Use with caution! This can easily break your table, if the column's content is overly long.
    ContentWidth,
    /// Enforce a fix width for a column.
    Width(u16),
    /// Specify a min amount of characters per line for a column.
    MinWidth(u16),
    /// Specify a max amount of allowed characters per line for a column.
    MaxWidth(u16),
    /// Set a fixed percentage in respect to table_width for this column.
    /// **Warning:** This option will be ignored, if the width cannot be determined!
    Percentage(u16),
    /// Set a a minimum percentage in respect to table_width for this column.
    /// **Warning:** This option will be ignored, if the width cannot be determined!
    MinPercentage(u16),
    /// Set a a maximum percentage in respect to table_width for this column.
    /// **Warning:** This option will be ignored, if the width cannot be determined!
    MaxPercentage(u16),
}
