import { useState, useEffect } from 'react'
import {
  Box, Typography, Button, List, ListItem, ListItemButton,
  ListItemText, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'

export default function HomeScreen({ onOpenProject }) {
  const [projects, setProjects] = useState([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    window.api.listProjects().then(setProjects)
  }, [])

  async function handleCreate() {
    const name = newName.trim()
    if (!name) return
    const project = await window.api.createProject(name)
    setDialogOpen(false)
    setNewName('')
    onOpenProject(project)
  }

  async function handleOpen(name) {
    const project = await window.api.loadProject(name)
    onOpenProject(project)
  }

  return (
    <Box sx={{ p: 4, maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" gutterBottom>Badge Generator</Typography>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => setDialogOpen(true)}
        sx={{ mb: 3 }}
      >
        Новый проект
      </Button>

      {projects.length === 0 && (
        <Typography color="text.secondary">Проектов пока нет</Typography>
      )}

      <List>
        {projects.map(name => (
          <ListItem key={name} disablePadding>
            <ListItemButton onClick={() => handleOpen(name)}>
              <ListItemText primary={name} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Новый проект</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Название проекта"
            fullWidth
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleCreate} variant="contained" disabled={!newName.trim()}>
            Создать
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
