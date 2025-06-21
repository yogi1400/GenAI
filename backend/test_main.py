import requests

def test_health():
    r = requests.get('http://localhost:8000/api/health')
    assert r.status_code == 200
    assert r.json()['status'] == 'ok'

def test_agent_chat():
    r = requests.post('http://localhost:8000/api/agent/chat', json={"message": "How do I stay productive?", "history": []})
    assert r.status_code == 200
    assert 'Tip' in r.json()['response'] or 'productivity' in r.json()['response'].lower()
