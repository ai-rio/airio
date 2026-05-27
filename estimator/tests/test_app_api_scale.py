"""Pin app_api._match_scale against the eletroduto-false-positive bug.

BR plantas carry many `Ø 1/2"` / `TUBO 1/2"` / `1-1/2"` labels — eletroduto is
sized in inches (see reference_br_quadro_conventions). The first cut of
`_SCALE_RX` was too permissive and on a planta with 20 eletroduto labels and 1
titleblock `ESC. 1:50` would persist `scale_denom=2` to D1. The fix mirrors
count.py:294's two-branch protection (ESC-prefixed → \\d{1,3}, bare → \\d{2,3}
+ anchored) plus an inch-marker (`"`) hard reject.
"""
from app_api import _match_scale


def _w(x0, y0, x1, y1, text, block=0, line=0, word=0):
    """Build a PyMuPDF-shaped word tuple for synthetic inputs."""
    return (x0, y0, x1, y1, text, block, line, word)


# --- The regression pin ------------------------------------------------------


def test_eletroduto_does_not_win_over_titleblock_esc():
    """20 `Ø 1/2"` labels + 1 `ESC. 1:50` titleblock → must return 50, not 2.

    This is the exact catastrophe the task describes — most-common-denom voting
    against an unguarded regex picked denom=2 on real plantas.
    """
    words = [_w(0, 0, 50, 10, 'ESC.', block=0, line=0, word=0),
             _w(50, 0, 90, 10, '1:50', block=0, line=0, word=1)]
    # 20 eletroduto labels on later lines.
    for i in range(20):
        words.append(_w(0, 100 + i * 20, 30, 110 + i * 20, 'Ø', block=1, line=i, word=0))
        words.append(_w(30, 100 + i * 20, 70, 110 + i * 20, '1/2"', block=1, line=i, word=1))
    denom, _txt, _bbox = _match_scale(words)
    assert denom == 50


# --- Inch labels never match -------------------------------------------------


def test_inch_label_with_paren_denom_two_rejected():
    """`Ø 1/2"` must NEVER produce denom=2."""
    words = [_w(0, 0, 30, 10, 'Ø', block=0, line=0, word=0),
             _w(30, 0, 70, 10, '1/2"', block=0, line=0, word=1)]
    assert _match_scale(words) == (None, None, None)


def test_tubo_inch_label_rejected():
    """`TUBO 1/2"` must NEVER produce denom=2."""
    words = [_w(0, 0, 40, 10, 'TUBO', block=0, line=0, word=0),
             _w(40, 0, 80, 10, '1/2"', block=0, line=0, word=1)]
    assert _match_scale(words) == (None, None, None)


def test_compound_fraction_inch_rejected():
    """`1-1/2"` (single token) must NEVER match — both inch marker AND fraction
    inside a longer string."""
    words = [_w(0, 0, 40, 10, '1-1/2"', block=0, line=0, word=0)]
    assert _match_scale(words) == (None, None, None)


def test_quarter_inch_label_rejected():
    """`Ø1/4` (no space, no inch marker) must NEVER produce denom=4 — bare
    branch requires \\d{2,3} AND `^1...` anchor; fraction starts with Ø."""
    words = [_w(0, 0, 30, 10, 'Ø1/4', block=0, line=0, word=0)]
    assert _match_scale(words) == (None, None, None)


# --- Titleblock variants accept --------------------------------------------


def test_esc_dot_colon_split_pair():
    """`ESC.: 1/50` across two words → denom 50. The single-word pass picks up
    `1/50` first (bare branch, \\d{2,3} satisfied), so the returned bbox is the
    tighter single-token rect — that is correct, the pair branch is the
    fallback for cases the single-word branch misses."""
    words = [_w(0, 0, 40, 10, 'ESC.:', block=0, line=0, word=0),
             _w(40, 0, 80, 10, '1/50', block=0, line=0, word=1)]
    denom, txt, _bbox = _match_scale(words)
    assert denom == 50
    assert '1/50' in txt


def test_esc_space_colon_pair():
    """`ESC 1:50` (no punctuation) split across two words → denom 50."""
    words = [_w(0, 0, 30, 10, 'ESC', block=0, line=0, word=0),
             _w(30, 0, 70, 10, '1:50', block=0, line=0, word=1)]
    assert _match_scale(words)[0] == 50


def test_bare_one_colon_fifty_accepted():
    """`1:50` standalone → denom 50 (bare branch, \\d{2,3} satisfied)."""
    words = [_w(0, 0, 30, 10, '1:50', block=0, line=0, word=0)]
    denom, txt, bbox = _match_scale(words)
    assert denom == 50
    assert txt == '1:50'
    assert bbox == [0, 0, 30, 10]


def test_bare_one_slash_seventyfive_accepted():
    """`1/75` standalone → denom 75."""
    words = [_w(0, 0, 30, 10, '1/75', block=0, line=0, word=0)]
    assert _match_scale(words)[0] == 75


def test_bare_one_slash_hundred_accepted():
    """`1/100` standalone → denom 100 (boundary at \\d{3})."""
    words = [_w(0, 0, 30, 10, '1/100', block=0, line=0, word=0)]
    assert _match_scale(words)[0] == 100


def test_bare_one_colon_twohundred_accepted():
    """`1:200` standalone → denom 200."""
    words = [_w(0, 0, 30, 10, '1:200', block=0, line=0, word=0)]
    assert _match_scale(words)[0] == 200


# --- Empty / no-scale page --------------------------------------------------


def test_no_scale_just_eletroduto_labels():
    """Page with only inch labels (no titleblock) → (None, None, None)."""
    words = [_w(0, 0, 30, 10, 'Ø', block=0, line=0, word=0),
             _w(30, 0, 70, 10, '1/2"', block=0, line=0, word=1),
             _w(0, 20, 30, 30, 'Ø', block=0, line=1, word=0),
             _w(30, 20, 70, 30, '3/4"', block=0, line=1, word=1)]
    assert _match_scale(words) == (None, None, None)


def test_empty_words():
    assert _match_scale([]) == (None, None, None)


# --- Bare-vs-ESC boundary at denom < 10 --------------------------------------


def test_bare_one_colon_five_rejected():
    """`1:5` standalone → reject (bare branch requires \\d{2,3})."""
    words = [_w(0, 0, 30, 10, '1:5', block=0, line=0, word=0)]
    assert _match_scale(words) == (None, None, None)


def test_esc_one_colon_five_accepted():
    """`ESC: 1:5` → accept (ESC branch allows \\d{1,3})."""
    words = [_w(0, 0, 30, 10, 'ESC:', block=0, line=0, word=0),
             _w(30, 0, 60, 10, '1:5', block=0, line=0, word=1)]
    assert _match_scale(words)[0] == 5


def test_esc_one_colon_one_accepted():
    """`ESC: 1:1` → accept (CAD default; ESC branch allows \\d{1,3})."""
    words = [_w(0, 0, 30, 10, 'ESC:', block=0, line=0, word=0),
             _w(30, 0, 60, 10, '1:1', block=0, line=0, word=1)]
    assert _match_scale(words)[0] == 1
