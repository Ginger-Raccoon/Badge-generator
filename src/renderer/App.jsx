import { useState } from 'react'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import HomeScreen from './screens/HomeScreen'
import Editor from './screens/Editor'

const theme = createTheme({
  palette: {
    primary: {
      main: 'rgb(208, 16, 5)',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        .MuiFormLabel-root.Mui-focused {
          color: rgba(0, 0, 0, 0.6) !important;
        }
      `,
    },
  },
})

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
