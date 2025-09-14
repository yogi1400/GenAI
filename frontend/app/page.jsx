"use client";
import React from "react";
import ThemeProvider from "./ThemeProvider";
import * as api from "./api";
import { useState } from "react";
import { CircularProgress, Collapse, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { Container, Typography, Box, Button, Grid, Card, CardContent, CardActions, Avatar } from "@mui/material";
import { School, Article, PlayCircle, Code, Quiz, Search } from "@mui/icons-material";

const features = [
  {
    title: "Concept Explorer",
    desc: "Browse and search all AI/ML concepts with interactive visualizations.",
    action: "Explore Concepts",
    icon: <School fontSize="large" sx={{ color: "#1976d2" }} />
  },
  {
    title: "Research Paper Library",
    desc: "Access, search, and summarize the latest AI/ML research papers.",
    action: "View Papers",
    icon: <Article fontSize="large" sx={{ color: "#9c27b0" }} />
  },
  {
    title: "Interactive Demos",
    desc: "Run code, visualize algorithms, and experiment hands-on.",
    action: "Try Demos",
    icon: <PlayCircle fontSize="large" sx={{ color: "#43e97b" }} />
  },
  {
    title: "Code Playground",
    desc: "Experiment with ML code snippets and see instant results.",
    action: "Open Playground",
    icon: <Code fontSize="large" sx={{ color: "#ff9800" }} />
  },
  {
    title: "Quizzes & Assessments",
    desc: "Test your knowledge with interactive quizzes and challenges.",
    action: "Take Quiz",
    icon: <Quiz fontSize="large" sx={{ color: "#e91e63" }} />
  },
  {
    title: "AI-powered Search",
    desc: "Semantic and contextual search across all content.",
    action: "Search Now",
    icon: <Search fontSize="large" sx={{ color: "#00bcd4" }} />
  }
];

const FeatureCard = React.memo(function FeatureCard({ f, onAction }) {
  return (
    <Card
      sx={{
        borderRadius: 6,
        boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
        background: "rgba(255,255,255,0.15)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.18)",
        minHeight: 240,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        transition: "transform 0.2s, box-shadow 0.2s",
        '&:hover': {
          transform: "scale(1.04)",
          boxShadow: "0 16px 40px 0 rgba(31, 38, 135, 0.37)",
        },
      }}
    >
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
          <Avatar sx={{ bgcolor: "transparent", mr: 1, width: 48, height: 48 }}>
            {f.icon}
          </Avatar>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#222", fontFamily: 'Montserrat, sans-serif' }}>
            {f.title}
          </Typography>
        </Box>
        <Typography variant="body1" sx={{ color: "#333", fontFamily: 'Montserrat, sans-serif' }}>
          {f.desc}
        </Typography>
      </CardContent>
      <CardActions>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          sx={{
            fontWeight: 700,
            fontFamily: 'Montserrat, sans-serif',
            background: "linear-gradient(90deg,#43e97b 0%,#38f9d7 100%)",
            color: "#222",
            boxShadow: "0 2px 8px rgba(67,233,123,0.15)",
            '&:hover': {
              background: "linear-gradient(90deg,#38f9d7 0%,#43e97b 100%)",
              color: "#222",
            },
          }}
          onClick={onAction}
        >
          {f.action}
        </Button>
      </CardActions>
    </Card>
  );
});

export default function HomePage() {
  // Interactive states for each module
  const [concepts, setConcepts] = useState([]);
  const [conceptsError, setConceptsError] = useState("");
  const [papers, setPapers] = useState([]);
  const [papersError, setPapersError] = useState("");
  const [demos, setDemos] = useState([]);
  const [demosError, setDemosError] = useState("");
  const [quizzes, setQuizzes] = useState([]);
  const [quizzesError, setQuizzesError] = useState("");
  const [playgroundCode, setPlaygroundCode] = useState("");
  const [playgroundOutput, setPlaygroundOutput] = useState("");
  const [playgroundError, setPlaygroundError] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [chatResponse, setChatResponse] = useState("");
  const [chatError, setChatError] = useState("");
  const [loading, setLoading] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);

  // Fetch data handlers
  const loadConcepts = async () => {
    setLoading("concepts");
    setConceptsError("");
    try {
      setConcepts(await api.fetchConcepts());
    } catch (e) {
      setConceptsError("Failed to load concepts");
    }
    setLoading("");
  };
  const loadPapers = async () => {
    setLoading("papers");
    setPapersError("");
    try {
      setPapers(await api.fetchPapers());
    } catch (e) {
      setPapersError("Failed to load papers");
    }
    setLoading("");
  };
  const loadDemos = async () => {
    setLoading("demos");
    setDemosError("");
    try {
      setDemos(await api.fetchDemos());
    } catch (e) {
      setDemosError("Failed to load demos");
    }
    setLoading("");
  };
  const loadQuizzes = async () => {
    setLoading("quizzes");
    setQuizzesError("");
    try {
      setQuizzes(await api.fetchQuizzes());
    } catch (e) {
      setQuizzesError("Failed to load quizzes");
    }
    setLoading("");
  };

  // Playground handler
  const runPlayground = async () => {
    setLoading("playground");
    setPlaygroundError("");
    try {
      const res = await api.runPlayground(playgroundCode);
      setPlaygroundOutput(res.output);
    } catch (e) {
      setPlaygroundError("Error running code");
      setPlaygroundOutput("");
    }
    setLoading("");
  };

  // Chat handler
  const sendChat = async () => {
    setLoading("chat");
    setChatError("");
    try {
      const res = await api.chatAgent(chatInput, chatHistory);
      setChatResponse(res.response);
      setChatHistory([...chatHistory, { user: chatInput, ai: res.response }]);
      setChatInput("");
    } catch (e) {
      setChatError("Error chatting with agent");
      setChatResponse("");
    }
    setLoading("");
  };

  return (
    <ThemeProvider>
      <Box
        sx={{
          minHeight: "100vh",
          width: "100vw",
          background: "linear-gradient(120deg, #43e97b 0%, #38f9d7 50%, #9c27b0 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          py: 8,
        }}
      >
        <Box textAlign="center" sx={{ mb: 6 }}>
          <Typography
            variant="h2"
            sx={{
              color: "#fff",
              fontWeight: 900,
              mb: 2,
              fontSize: { xs: 36, md: 64 },
              fontFamily: 'Montserrat, sans-serif',
              textShadow: "0 2px 16px rgba(67,233,123,0.25)",
            }}
          >
            GenAI: Advanced AI/ML Study App
          </Typography>
          <Typography
            variant="h5"
            sx={{
              color: "#f3f3f3",
              mb: 3,
              fontSize: { xs: 18, md: 28 },
              fontFamily: 'Montserrat, sans-serif',
              textShadow: "0 1px 8px rgba(67,233,123,0.15)",
            }}
          >
            Explore all AI/ML concepts, research papers, interactive demos, and more.
          </Typography>
        </Box>
        {/* Interactive modules with tabs and collapses */}
        <Box sx={{ width: "100%", maxWidth: 1200, mb: 4 }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} centered sx={{ mb: 2 }}>
            <Tab label="Concepts" />
            <Tab label="Papers" />
            <Tab label="Demos" />
            <Tab label="Playground" />
            <Tab label="Quizzes" />
            <Tab label="Chat" />
          </Tabs>
          <Collapse in={activeTab === 0}>
            <Grid container spacing={2} justifyContent="center">
              <Grid item xs={12}>
                <FeatureCard
                  f={features[0]}
                  onAction={() => {
                    loadConcepts();
                    document.getElementById('concepts-list')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                />
                <Button
                  onClick={loadConcepts}
                  sx={{ mt: 2 }}
                  variant="contained"
                  color="primary"
                >
                  Load Concepts
                </Button>
                {loading === "concepts" && <CircularProgress sx={{ mt: 2 }} />}
                {conceptsError && <Typography color="error">{conceptsError}</Typography>}
                <div id="concepts-list">
                  {concepts.length > 0 && concepts.map(c => (
                    <Box key={c.id} sx={{ mt: 1, p: 1, bgcolor: "rgba(255,255,255,0.1)", borderRadius: 2 }}>
                      <Typography fontWeight={700}>{c.name}</Typography>
                      <Typography>{c.description}</Typography>
                    </Box>
                  ))}
                </div>
              </Grid>
            </Grid>
          </Collapse>
          <Collapse in={activeTab === 1}>
            <Grid container spacing={2} justifyContent="center">
              <Grid item xs={12}>
                <FeatureCard f={features[1]} />
                <Button onClick={loadPapers} sx={{ mt: 2 }} variant="contained" color="primary">Load Papers</Button>
                {loading === "papers" && <CircularProgress sx={{ mt: 2 }} />}
                {papersError && <Typography color="error">{papersError}</Typography>}
                {papers.length > 0 && papers.map(p => (
                  <Box key={p.id} sx={{ mt: 1, p: 1, bgcolor: "rgba(255,255,255,0.1)", borderRadius: 2 }}>
                    <Typography fontWeight={700}>{p.title}</Typography>
                    <Typography>{p.abstract}</Typography>
                    <Typography fontSize={12} color="text.secondary">Authors: {p.authors.join(", ")}</Typography>
                    <a href={p.url} target="_blank" rel="noopener noreferrer">Read Paper</a>
                  </Box>
                ))}
              </Grid>
            </Grid>
          </Collapse>
          <Collapse in={activeTab === 2}>
            <Grid container spacing={2} justifyContent="center">
              <Grid item xs={12}>
                <FeatureCard f={features[2]} />
                <Button onClick={loadDemos} sx={{ mt: 2 }} variant="contained" color="primary">Load Demos</Button>
                {loading === "demos" && <CircularProgress sx={{ mt: 2 }} />}
                {demosError && <Typography color="error">{demosError}</Typography>}
                {demos.length > 0 && demos.map(d => (
                  <Box key={d.id} sx={{ mt: 1, p: 1, bgcolor: "rgba(255,255,255,0.1)", borderRadius: 2 }}>
                    <Typography fontWeight={700}>{d.title}</Typography>
                    <Typography>{d.description}</Typography>
                    <pre style={{ fontSize: 12, background: "#222", color: "#fff", borderRadius: 4, padding: 8 }}>{d.code}</pre>
                  </Box>
                ))}
              </Grid>
            </Grid>
          </Collapse>
          <Collapse in={activeTab === 3}>
            <Grid container spacing={2} justifyContent="center">
              <Grid item xs={12}>
                <FeatureCard f={features[3]} />
                <Box sx={{ mt: 2 }}>
                  <textarea value={playgroundCode} onChange={e => setPlaygroundCode(e.target.value)} rows={4} style={{ width: "100%", borderRadius: 4, padding: 8 }} placeholder="Enter Python code..." />
                  <Button onClick={runPlayground} sx={{ mt: 1 }} variant="contained" color="primary">Run Code</Button>
                  {loading === "playground" && <CircularProgress sx={{ mt: 2 }} />}
                  {playgroundError && <Typography color="error">{playgroundError}</Typography>}
                  {playgroundOutput && <Typography sx={{ mt: 1 }}>Output: {playgroundOutput}</Typography>}
                </Box>
              </Grid>
            </Grid>
          </Collapse>
          <Collapse in={activeTab === 4}>
            <Grid container spacing={2} justifyContent="center">
              <Grid item xs={12}>
                <FeatureCard f={features[4]} />
                <Button onClick={loadQuizzes} sx={{ mt: 2 }} variant="contained" color="primary">Load Quizzes</Button>
                {loading === "quizzes" && <CircularProgress sx={{ mt: 2 }} />}
                {quizzesError && <Typography color="error">{quizzesError}</Typography>}
                {quizzes.length > 0 && quizzes.map(q => (
                  <Box key={q.id} sx={{ mt: 1, p: 1, bgcolor: "rgba(255,255,255,0.1)", borderRadius: 2 }}>
                    <Typography fontWeight={700}>{q.question}</Typography>
                    <ul>{q.options.map((opt, idx) => <li key={idx}>{opt}</li>)}</ul>
                  </Box>
                ))}
              </Grid>
            </Grid>
          </Collapse>
          <Collapse in={activeTab === 5}>
            <Grid container spacing={2} justifyContent="center">
              <Grid item xs={12}>
                <FeatureCard f={features[5]} />
                <Box sx={{ mt: 2 }}>
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} style={{ width: "100%", borderRadius: 4, padding: 8 }} placeholder="Ask the AI agent..." />
                  <Button onClick={sendChat} sx={{ mt: 1 }} variant="contained" color="primary">Send</Button>
                  {loading === "chat" && <CircularProgress sx={{ mt: 2 }} />}
                  {chatError && <Typography color="error">{chatError}</Typography>}
                  {chatResponse && <Typography sx={{ mt: 1 }}>AI: {chatResponse}</Typography>}
                  {chatHistory.length > 0 && <Box sx={{ mt: 1 }}>
                    <Typography fontWeight={700}>History:</Typography>
                    {chatHistory.map((h, idx) => (
                      <Box key={idx} sx={{ p: 1, bgcolor: "rgba(255,255,255,0.05)", borderRadius: 2, mb: 1 }}>
                        <Typography>User: {h.user}</Typography>
                        <Typography>AI: {h.ai}</Typography>
                      </Box>
                    ))}
                  </Box>}
                </Box>
              </Grid>
            </Grid>
          </Collapse>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
