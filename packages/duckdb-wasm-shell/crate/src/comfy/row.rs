use std::slice::Iter;

use super::cell::{Cell, Cells};

/// Each row contains [Cells](crate::Cell) and can be added to a [Table](crate::Table).
#[derive(Clone, Debug)]
pub struct Row {
    /// Index of the row.
    /// This will be set as soon as the row is added to the table.
    pub(crate) index: Option<usize>,
    pub(crate) cells: Vec<Cell>,
    pub(crate) max_height: Option<usize>,
}

impl Default for Row {
    fn default() -> Self {
        Self::new()
    }
}

impl Row {
    pub fn new() -> Row {
        Row {
            index: None,
            cells: Vec::new(),
            max_height: None,
        }
    }

    /// Add a cell to the row.
    pub fn add_cell(&mut self, cell: Cell) -> &mut Self {
        self.cells.push(cell);

        self
    }

    /// Truncate content of cells which occupies more than X lines of space.
    pub fn max_height(&mut self, lines: usize) -> &mut Self {
        self.max_height = Some(lines);

        self
    }

    /// Get the longest content width for all cells of this row
    pub(crate) fn max_content_widths(&self) -> Vec<usize> {
        // Iterate over all cells
        self.cells
            .iter()
            .map(|cell| {
                // Iterate over all content strings and return a vector of string widths.
                // Each entry represents the longest string width for a cell.
                cell.content
                    .iter()
                    .map(|string| string.chars().count())
                    .max()
                    .unwrap_or(0)
            })
            .collect()
    }

    /// Get the amount of cells on this row.
    pub fn cell_count(&self) -> usize {
        self.cells.len()
    }

    /// Returns an iterator over all cells of this row
    pub fn cell_iter(&self) -> Iter<Cell> {
        self.cells.iter()
    }
}

/// Create a Row from any `Into<Cells>`. \
/// [Cells] is a simple wrapper around a `Vec<Cell>`.
///
/// Check the [From] implementations on [Cell] for more information.
impl<T: Into<Cells>> From<T> for Row {
    fn from(cells: T) -> Row {
        Row {
            index: None,
            cells: cells.into().0,
            max_height: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_correct_max_content_width() {
        let row = Row::from(vec![
            "",
            "four",
            "fivef",
            "sixsix",
            "11 but with\na newline",
        ]);

        let max_content_widths = row.max_content_widths();

        assert_eq!(max_content_widths, vec![0, 4, 5, 6, 11]);
    }

    #[test]
    fn test_some_functions() {
        let cells = vec!["one", "two", "three"];
        let mut row = Row::new();
        for cell in cells.iter() {
            row.add_cell(Cell::new(cell));
        }

        let mut cell_content_iter = cells.iter();
        for cell in row.cell_iter() {
            assert_eq!(
                cell.get_content(),
                cell_content_iter.next().unwrap().to_string()
            );
        }
    }
}
