/// The default style for tables.
///
/// ```text
/// +-------+-------+
/// | Hello | there |
/// +===============+
/// | a     | b     |
/// +-------+-------+
/// | c     | d     |
/// +-------+-------+
/// ```
pub const ASCII_FULL: &str = "||--+==+|-+||++++++";

/// Default style without any borders.
///
/// ```text
///  Hello | there
/// ===============
///  a     | b
/// -------+-------
///  c     | d
/// ```
pub const ASCII_NO_BORDERS: &str = "     == |-+        ";

/// Just like ASCII_FULL, but without vertical/horizontal middle lines.
///
/// ```text
/// +-------+-------+
/// | Hello | there |
/// +=======+=======+
/// | a     | b     |
/// | c     | d     |
/// +-------+-------+
/// ```
pub const ASCII_BORDERS_NO_HORIZONTAL: &str = "||--+=++| +  ++++++";

/// Just like ASCII_FULL, but without vertical/horizontal middle lines.
///
/// ```text
/// +---------------+
/// | Hello   there |
/// +===============+
/// | a       b     |
/// | c       d     |
/// +---------------+
/// ```
pub const ASCII_BORDERS_ONLY: &str = "||--+==+     --++++";

/// Just like ASCII_FULL, but without vertical/horizontal middle lines and no side borders.
///
/// ```text
/// ---------------
///  Hello   there
/// ===============
///  a       b
///  c       d
/// ---------------
/// ```
pub const ASCII_HORIZONTAL_BORDERS_ONLY: &str = "  -- ==  --  --    ";

/// Markdown like table styles.
///
/// ```text
/// ---------------
///  Hello   there
/// ===============
///  a       b
///  c       d
/// ---------------
/// ```
pub const ASCII_MARKDOWN: &str = "||  |-|||           ";

/// The UTF8 enabled version of the default style for tables.\
/// Quite beautiful isn't it? It's drawn with UTF8's box drawing characters.
///
/// ```text
/// ┌───────┬───────┐
/// │ Hello │ there │
/// ╞═══════╪═══════╡
/// │ a     ┆ b     │
/// ├╌╌╌╌╌╌╌┼╌╌╌╌╌╌╌┤
/// │ c     ┆ d     │
/// └───────┴───────┘
/// ```
pub const UTF8_FULL: &str = "││──╞═╪╡┆─┼├┤┬┴┌┐└┘";
pub const UTF8_BORDERS_NO_HORIZONTAL: &str = "││──╞═╪╡┆ ┼  ┬┴┌┐└┘";

/// Default UTF8 style, but without any borders.
///
/// ```text
///  Hello │ there
/// ═══════╪═══════
///  a     ┆ b
/// ╌╌╌╌╌╌╌┼╌╌╌╌╌╌╌
///  c     ┆ d
/// ```
pub const UTF8_NO_BORDERS: &str = "     ═╪ ┆╌┼        ";

/// Just like the UTF8 FULL version, but without vertical/horizontal middle lines.
///
/// ```text
/// ┌───────────────┐
/// │ Hello   there │
/// ╞═══════════════╡
/// │ a       b     │
/// │ c       d     │
/// └───────────────┘
/// ```
pub const UTF8_BORDERS_ONLY: &str = "││──╞══╡     ──┌┐└┘";

/// Only display vertical lines.
///
/// ```text
/// ───────────────
///  Hello   there
/// ═══════════════
///  a       b
/// ───────────────
///  c       d
/// ───────────────
/// ```
pub const UTF8_HORIZONTAL_BORDERS_ONLY: &str = "  ── ══  ──  ──    ";

/// Don't draw any borders
///
/// ```text
///  Hello  there
///  a      b
///  c      d
/// ```
pub const NOTHING: &str = "                   ";
