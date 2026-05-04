import { useState, useEffect } from 'react'
import {
  Box, Typography, Button, List, ListItem, ListItemButton,
  ListItemText, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, AppBar, Toolbar,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'

export default function HomeScreen({ onOpenProject }) {
  const [projects, setProjects] = useState([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [favorites, setFavorites] = useState([])
  const [skipDeleteConfirm, setSkipDeleteConfirm] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false)

  useEffect(() => {
    Promise.all([
      window.api.listProjects(),
      window.api.loadPrefs(),
    ]).then(([projectList, prefs]) => {
      setProjects(projectList)
      setFavorites(prefs.favorites)
      setSkipDeleteConfirm(prefs.skipDeleteConfirm)
    })
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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="static" elevation={1} color="default">
        <Toolbar variant="dense">
          <Box component="img" src="icon.png" sx={{ width: 28, height: 28, mr: 1.5, borderRadius: 1 }} />
          <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>
            Бейджик
          </Typography>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
          >
            Новый проект
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 4, maxWidth: 600, mx: 'auto', width: '100%' }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
          {projects.length === 0 ? 'Нет проектов' : 'Ваши проекты'}
        </Typography>

        <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {projects.map(name => (
            <ListItem key={name} disablePadding sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
              <ListItemButton onClick={() => handleOpen(name)}>
                <ListItemText primary={name} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

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
