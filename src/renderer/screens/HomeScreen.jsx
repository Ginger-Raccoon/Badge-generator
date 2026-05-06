import { useState, useEffect } from 'react'
import {
  Box, Typography, Button, List, ListItem, ListItemButton,
  ListItemText, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, AppBar, Toolbar, IconButton, Divider,
  Checkbox, FormControlLabel,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import DeleteIcon from '@mui/icons-material/Delete'
import SettingsIcon from '@mui/icons-material/Settings'
import SettingsDrawer from '../components/SettingsDrawer'

export default function HomeScreen({ onOpenProject }) {
  const [projects, setProjects] = useState([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [prefs, setPrefs] = useState({ favorites: [], skipDeleteConfirm: false, defaultFont: 'Roboto', defaultFontSize: 12 })
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      window.api.listProjects(),
      window.api.loadPrefs(),
    ]).then(([projectList, loadedPrefs]) => {
      setProjects(projectList)
      setPrefs(loadedPrefs)
    })
  }, [])

  async function handlePrefsChange(patch) {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    await window.api.savePrefs(next)
  }

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

  async function toggleFavorite(e, name) {
    e.stopPropagation()
    const next = prefs.favorites.includes(name)
      ? prefs.favorites.filter(f => f !== name)
      : [...prefs.favorites, name]
    await handlePrefsChange({ favorites: next })
  }

  async function confirmDelete(name) {
    const nextFavorites = prefs.favorites.filter(f => f !== name)
    await handlePrefsChange({ favorites: nextFavorites })
    await window.api.deleteProject(name)
    setProjects(prev => prev.filter(p => p !== name))
  }

  async function handleDeleteClick(e, name) {
    e.stopPropagation()
    if (prefs.skipDeleteConfirm) {
      await confirmDelete(name)
    } else {
      setDeleteConfirmChecked(false)
      setPendingDelete(name)
    }
  }

  async function handleConfirmDelete() {
    try {
      const nextFavorites = prefs.favorites.filter(f => f !== pendingDelete)
      const nextSkip = deleteConfirmChecked || prefs.skipDeleteConfirm
      await handlePrefsChange({ favorites: nextFavorites, skipDeleteConfirm: nextSkip })
      await window.api.deleteProject(pendingDelete)
      setProjects(prev => prev.filter(p => p !== pendingDelete))
      setPendingDelete(null)
    } catch (err) {
      console.error('Ошибка при удалении проекта:', err)
      setPendingDelete(null)
    }
  }

  async function handleDeleteAll() {
    await window.api.deleteAllProjects()
    const next = { ...prefs, favorites: [] }
    setProjects([])
    setPrefs(next)
    await window.api.savePrefs(next)
    setSettingsOpen(false)
  }

  function renderItem(name) {
    const isFav = prefs.favorites.includes(name)
    return (
      <ListItem key={name} disablePadding sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
        <ListItemButton onClick={() => handleOpen(name)}>
          <ListItemText primary={name} />
          <IconButton size="small" onClick={e => toggleFavorite(e, name)} sx={{ mr: 0.5 }}>
            {isFav ? <StarIcon fontSize="small" color="primary" /> : <StarBorderIcon fontSize="small" />}
          </IconButton>
          <IconButton size="small" onClick={e => handleDeleteClick(e, name)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </ListItemButton>
      </ListItem>
    )
  }

  const favList = projects.filter(n => prefs.favorites.includes(n))
  const otherList = projects.filter(n => !prefs.favorites.includes(n))

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

        <>
          <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {favList.map(renderItem)}
          </List>
          {favList.length > 0 && otherList.length > 0 && (
            <Divider sx={{ my: 1.5 }} />
          )}
          <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {otherList.map(renderItem)}
          </List>
        </>
      </Box>

      <IconButton
        onClick={() => setSettingsOpen(true)}
        sx={{ position: 'fixed', bottom: 16, right: 16, bgcolor: 'background.paper', boxShadow: 2, '&:hover': { bgcolor: 'background.paper' } }}
      >
        <SettingsIcon />
      </IconButton>

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

      <Dialog open={!!pendingDelete} onClose={() => setPendingDelete(null)} fullWidth maxWidth="xs">
        <DialogTitle>Удалить «{pendingDelete}»?</DialogTitle>
        <DialogContent>
          <FormControlLabel
            control={
              <Checkbox
                checked={deleteConfirmChecked}
                onChange={e => setDeleteConfirmChecked(e.target.checked)}
                size="small"
              />
            }
            label="Больше не спрашивать"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDelete(null)}>Отмена</Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error">
            Удалить
          </Button>
        </DialogActions>
      </Dialog>

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        prefs={prefs}
        onPrefsChange={handlePrefsChange}
        projects={projects}
        onDeleteAll={handleDeleteAll}
      />
    </Box>
  )
}
