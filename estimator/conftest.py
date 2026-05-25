"""Test fixtures. Adds the estimator dir to sys.path (flat module layout) and
resolves the real project PDFs; integration tests skip if a PDF is absent (the
PDFs live under docs/pdf/ and are not committed)."""
import sys
from pathlib import Path

import pytest

EST = Path(__file__).resolve().parent          # estimator/
ROOT = EST.parent                              # repo root
PDF = ROOT / "docs" / "pdf"
sys.path.insert(0, str(EST))                   # so `import schedule` etc. work

# Canonical sheets per ARCHITECTURE.md test matrix
SENAC_SUBSOLO_ELE = PDF / "senac/compatibilizados/02 - 1°SUBSOLO/02-ELETRICA/PDF/SIA-COM-ELE-EX-F02-1SS-SJ-R00.pdf"
BOTICARIO_PE02 = PDF / "boticario/PDF/J&J-LB-ELE-PE02_UNI.R04.pdf"
BOTICARIO_PE03_TER = PDF / "boticario/PDF/J&J-LB-ELE-PE03_TER.R09.pdf"
BOTICARIO_PE06_1PAV = PDF / "boticario/PDF/J&J-LB-ELE-PE06_1PAV.R09.pdf"
BOTICARIO_PE06_TRI = PDF / "boticario/PDF/J&J-LB-ELE-PE06_TRI.R03.pdf"
BOTICARIO_PE07_TRI = PDF / "boticario/PDF/J&J-LB-ELE-PE07_TRI.R04.pdf"
APEX_PLAN_2PV = PDF / "apex/APEX-AUDI-021-ELETRICA-2PV-R01.pdf"
APEX_SCHED_024 = PDF / "apex/APEX-AUDI-024-ELETRICA-ALI-R00.pdf"


def _need(path: Path) -> str:
    if not path.exists():
        pytest.skip(f"PDF fixture absent: {path}")
    return str(path)


@pytest.fixture
def senac_ele():
    return _need(SENAC_SUBSOLO_ELE)


@pytest.fixture
def boticario_pe02():
    return _need(BOTICARIO_PE02)


@pytest.fixture
def boticario_ter():
    return _need(BOTICARIO_PE03_TER)


@pytest.fixture
def boticario_pe06():
    return _need(BOTICARIO_PE06_1PAV)


@pytest.fixture
def boticario_pe06_tri():
    return _need(BOTICARIO_PE06_TRI)


@pytest.fixture
def boticario_pe07_tri():
    return _need(BOTICARIO_PE07_TRI)


@pytest.fixture
def apex_plan():
    return _need(APEX_PLAN_2PV)


@pytest.fixture
def apex_sched():
    return _need(APEX_SCHED_024)
