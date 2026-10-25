"""Replays hook payloads shaped like the ones captured by the probe and checks the outputs.

Run: python3 -m unittest discover -s helper-desk/tests -v
"""
import json
import os
import pathlib
import subprocess
import sys
import tempfile
import unittest

SCRIPTS = pathlib.Path(__file__).resolve().parent.parent / "scripts"
SESSION = "0f18d6f7-test"
AGENT = "a42de3533b5f895ac"
SECRET = "SECRET-PROMPT-TEXT-DO-NOT-STORE"


def run(script, payload, state_dir):
    env = dict(os.environ, HELPER_DESK_DIR=state_dir)
    proc = subprocess.run(
        [sys.executable, str(SCRIPTS / script)],
        input=json.dumps(payload),
        capture_output=True,
        text=True,
        env=env,
        check=True,
    )
    return proc.stdout


class HelperDeskTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = self.tmp.name

    def tearDown(self):
        self.tmp.cleanup()

    def hook(self, payload):
        payload = dict(payload, session_id=SESSION)
        run("record.py", payload, self.dir)

    def agent_result(self, status="completed"):
        return {
            "status": status,
            "prompt": SECRET,
            "agentId": AGENT,
            "agentType": "general-purpose",
            "content": SECRET,
            "resolvedModel": "claude-sonnet-5-5",
            "totalDurationMs": 6202,
            "totalTokens": 27868,
            "totalToolUseCount": 1,
            "usage": {
                "input_tokens": 2,
                "cache_creation_input_tokens": 113,
                "cache_read_input_tokens": 27733,
                "output_tokens": 20,
            },
            "toolStats": {"readCount": 0, "bashCount": 1, "editFileCount": 0},
        }

    def test_lifecycle_records_counts_and_no_content(self):
        self.hook({"hook_event_name": "SubagentStart", "agent_id": AGENT, "agent_type": "general-purpose"})
        self.hook({"hook_event_name": "PostToolUse", "tool_name": "Bash", "agent_id": AGENT,
                   "tool_input": {"command": SECRET}, "tool_response": {"stdout": SECRET}})
        self.hook({"hook_event_name": "SubagentStop", "agent_id": AGENT,
                   "last_assistant_message": SECRET, "agent_transcript_path": "/x/y.jsonl"})
        self.hook({"hook_event_name": "PostToolUse", "tool_name": "Agent",
                   "tool_input": {"prompt": SECRET}, "tool_response": self.agent_result()})

        raw = (pathlib.Path(self.dir) / f"{SESSION}.json").read_text()
        self.assertNotIn(SECRET, raw)

        agent = json.loads(raw)["agents"][AGENT]
        self.assertEqual(agent["status"], "completed")
        self.assertEqual(agent["tools"], 1)
        self.assertEqual(agent["tokens"], 27868)
        self.assertEqual(agent["model"], "claude-sonnet-5-5")
        self.assertIsNotNone(agent["cost_usd"])
        self.assertFalse(agent["cost_known"])  # default rates, not a model-specific entry

    def test_failed_result_is_recorded_as_failed(self):
        self.hook({"hook_event_name": "SubagentStart", "agent_id": AGENT, "agent_type": "general-purpose"})
        self.hook({"hook_event_name": "SubagentStop", "agent_id": AGENT})
        self.hook({"hook_event_name": "PostToolUse", "tool_name": "Agent",
                   "tool_response": self.agent_result(status="failed")})
        agent = json.loads((pathlib.Path(self.dir) / f"{SESSION}.json").read_text())["agents"][AGENT]
        self.assertEqual(agent["status"], "failed")

    def test_taskbar_and_report_show_entries(self):
        self.hook({"hook_event_name": "SubagentStart", "agent_id": AGENT, "agent_type": "general-purpose"})
        self.hook({"hook_event_name": "SubagentStop", "agent_id": AGENT})
        self.hook({"hook_event_name": "PostToolUse", "tool_name": "Agent",
                   "tool_response": self.agent_result()})
        bar = run("taskbar.py", {"session_id": SESSION}, self.dir)
        self.assertIn("general-purpose OK 27.9k tok", bar)
        report = run("report.py", {}, self.dir)  # no session flag: uses the latest state
        self.assertIn("tool calls: 1", report)
        self.assertIn("Estimated: cost", report)

    def test_subagent_rows_emit_one_row_per_task(self):
        self.hook({"hook_event_name": "SubagentStart", "agent_id": AGENT, "agent_type": "general-purpose"})
        task = {"id": AGENT, "agentType": "general-purpose", "status": "running", "tokenCount": 12000,
                "description": SECRET}
        out = run("subagent_rows.py", {"session_id": SESSION, "tasks": [task]}, self.dir)
        row = json.loads(out.strip())
        self.assertEqual(row["id"], AGENT)
        self.assertIn("RUNNING 12.0k tok", row["content"])
        self.assertNotIn(SECRET, out)
        agent = json.loads((pathlib.Path(self.dir) / f"{SESSION}.json").read_text())["agents"][AGENT]
        self.assertEqual(agent["live_tokens"], 12000)

    def test_taskbar_silent_without_agents(self):
        self.assertEqual(run("taskbar.py", {"session_id": "nobody"}, self.dir), "")


if __name__ == "__main__":
    unittest.main()
