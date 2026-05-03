import { useState } from 'react'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import HomeScreen from './screens/HomeScreen'

const theme = createTheme()

export default function App() {
  const [project, setProject] = useState(null)

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HomeScreen onOpenProject={setProject} />
    </ThemeProvider>
  )
}
