export const useNotifications = () => {
  const addNotification = (notification) => {
    if (typeof window !== 'undefined' && window.addNotification) {
      window.addNotification(notification)
    }
  }

  const success = (title, message) => {
    addNotification({
      type: 'success',
      title,
      message
    })
  }

  const error = (title, message) => {
    addNotification({
      type: 'error',
      title,
      message
    })
  }

  const warning = (title, message) => {
    addNotification({
      type: 'warning',
      title,
      message
    })
  }

  const info = (title, message) => {
    addNotification({
      type: 'info',
      title,
      message
    })
  }

  return {
    addNotification,
    success,
    error,
    warning,
    info
  }
}