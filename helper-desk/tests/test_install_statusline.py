"""Tests for the automatic settings.json wiring (scripts/install_statusline.py).

Run: python3 -m unittest discover -s helper-desk/tests -v
"""
import json
import os
import pathlib
import subprocess
import sys
import tempfile
import unittest

SCRIPT = pathlib.Path(__file__).resolve().parent.parent / "scripts" / "install_statusline.py"
TAR = SCRIPT.parent / "taskbar.py"
ROWS = SCRIPT.parent / "subagent_rows.py"


class InstallStatuslineTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = pathlib.Path(self.tmp.name) / "settings.json"

    def tearDown(self):
        self.tmp.cleanup()

    def run_install(self):
        env = dict(os.environ, HELPER_DESK_SETTINGS=str(self.path))
        subprocess.run([sys.executable, str(SCRIPT)], env=env, check=True, capture_output=True)
        return json.loads(self.path.read_text()) if self.path.exists() else None

    def test_creates_both_entries_when_missing(self):
        s = self.run_install()
        self.assertEqual(s["statusLine"]["command"], f"python3 {TAR}")
        self.assertEqual(s["subagentStatusLine"]["command"], f"python3 {ROWS}")

    def test_second_run_does_not_rewrite(self):
        self.run_install()
        mtime = self.path.stat().st_mtime_ns
        self.run_install()
        self.assertEqual(self.path.stat().st_mtime_ns, mtime)

    def test_keeps_foreign_statusline_and_other_keys(self):
        self.path.write_text(json.dumps({
            "model": "opus",
            "statusLine": {"type": "command", "command": "~/my-statusline.sh"},
        }))
        s = self.run_install()
        self.assertEqual(s["model"], "opus")
        self.assertEqual(s["statusLine"]["command"], "~/my-statusline.sh")
        self.assertEqual(s["subagentStatusLine"]["command"], f"python3 {ROWS}")

    def test_repoints_old_helper_desk_install(self):
        self.path.write_text(json.dumps({
            "statusLine": {"type": "command", "command": "python3 /old/helper-desk/scripts/taskbar.py"},
        }))
        s = self.run_install()
        self.assertEqual(s["statusLine"]["command"], f"python3 {TAR}")

    def test_invalid_json_is_left_alone(self):
        self.path.write_text("{not json")
        env = dict(os.environ, HELPER_DESK_SETTINGS=str(self.path))
        subprocess.run([sys.executable, str(SCRIPT)], env=env, check=True, capture_output=True)
        self.assertEqual(self.path.read_text(), "{not json")


if __name__ == "__main__":
    unittest.main()
