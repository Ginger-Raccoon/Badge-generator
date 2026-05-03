import { useState } from 'react'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import HomeScreen from './screens/HomeScreen'
import Editor from './screens/Editor'

const theme = createTheme()

export default function App() {
  const [project, setProject] = useState(null)

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {project
        ? <Editor project={project} onProjectUpdate={setProject} onBack={() => setProject(null)} />
        : <HomeScreen onOpenProject={setProject} />
      }
    </ThemeProvider>
  )
}
