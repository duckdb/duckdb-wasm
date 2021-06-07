use super::style::{CellAlignment, ColumnConstraint};

/// A representation of a table's column.
/// Useful for styling and specifying constraints how big a column should be.
///
/// 1. Content padding for cells in this column
/// 2. Constraints on how wide this column shall be
/// 3. Default alignment for cells in this column
///
/// Columns are generated when adding rows or a header to a table.\
/// As a result columns can only be modified after the table is populated by some data.
#[derive(Debug)]
pub struct Column {
    /// The index of the column
    pub index: usize,
    /// Left/right padding for each cell of this column in spaces
    pub(crate) padding: (u16, u16),
    /// The delimiter which is used to split the text into consistent pieces.
    /// Default is ` `.
    pub(crate) delimiter: Option<char>,
    /// Define the [CellAlignment] for all cells of this column
    pub(crate) cell_alignment: Option<CellAlignment>,
    pub(crate) max_content_width: u16,
    pub(crate) constraint: Option<ColumnConstraint>,
}

impl Column {
    pub fn new(index: usize) -> Self {
        Column {
            index,
            padding: (1, 1),
            delimiter: None,
            constraint: None,
            max_content_width: 0,
            cell_alignment: None,
        }
    }

    /// Set the padding for all cells of this column.
    ///
    /// Padding is provided in the form of (left, right).\
    /// Default is `(1, 1)`.
    pub fn set_padding(&mut self, padding: (u16, u16)) -> &mut Self {
        self.padding = padding;

        self
    }

    /// Set the delimiter used to split text for this column's cells.
    ///
    /// A custom delimiter on a cell in will overwrite the column's delimiter.
    /// Normal text uses spaces (` `) as delimiters. This is necessary to help comfy-table
    /// understand the concept of _words_.
    pub fn set_delimiter(&mut self, delimiter: char) -> &mut Self {
        self.delimiter = Some(delimiter);

        self
    }

    /// Get the width in characters of the widest line in this column.\
    /// This doesn't include padding yet!
    pub fn get_max_content_width(&self) -> u16 {
        self.max_content_width
    }

    /// Get the maximum possible width for this column.\
    /// This means widest line in this column + padding
    pub fn get_max_width(&self) -> u16 {
        self.max_content_width + self.padding.0 + self.padding.1
    }

    /// Constraints allow to influence the auto-adjustment behavior of columns.\
    /// This can be useful to counter undesired auto-adjustment of content in tables.
    pub fn set_constraint(&mut self, constraint: ColumnConstraint) -> &mut Self {
        self.constraint = Some(constraint);

        self
    }

    /// Get the constraint that is used for this column.
    pub fn get_constraint(&self) -> Option<&ColumnConstraint> {
        self.constraint.as_ref()
    }

    /// Remove any constraint on this column
    pub fn remove_constraint(&mut self) -> &mut Self {
        self.constraint = None;

        self
    }

    /// Set the alignment for content inside of cells for this column.\
    /// **Note:** Alignment on a cell will always overwrite the column's setting.
    pub fn set_cell_alignment(&mut self, alignment: CellAlignment) {
        self.cell_alignment = Some(alignment);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_column() {
        let mut column = Column::new(0);
        column.set_padding((0, 0));
        assert_eq!(column.get_max_content_width(), 0);

        column.set_constraint(ColumnConstraint::ContentWidth);
        assert_eq!(
            column.get_constraint(),
            Some(&ColumnConstraint::ContentWidth)
        );

        column.remove_constraint();
        assert_eq!(column.get_constraint(), None);
    }
}
