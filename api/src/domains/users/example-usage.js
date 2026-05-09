// Пример использования Users API через fetch/axios

const API_BASE = 'http://localhost:3000/api';

// 1. Получить всех пользователей
async function getAllUsers() {
  try {
    const response = await fetch(`${API_BASE}/users`);
    const users = await response.json();
    console.log('Все пользователи:', users);
    return users;
  } catch (error) {
    console.error('Ошибка при получении пользователей:', error);
  }
}

// 2. Создать пользователя
async function createUser(userData) {
  try {
    const response = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    
    if (response.status === 201) {
      const user = await response.json();
      console.log('Создан пользователь:', user);
      return user;
    } else {
      const error = await response.json();
      console.error('Ошибка при создании пользователя:', error);
    }
  } catch (error) {
    console.error('Ошибка при создании пользователя:', error);
  }
}

// 3. Получить пользователя по ID
async function getUserById(id) {
  try {
    const response = await fetch(`${API_BASE}/users/${id}`);
    if (response.status === 200) {
      const user = await response.json();
      console.log(`Пользователь с ID ${id}:`, user);
      return user;
    } else if (response.status === 404) {
      console.log(`Пользователь с ID ${id} не найден`);
    }
  } catch (error) {
    console.error('Ошибка при получении пользователя:', error);
  }
}

// 4. Обновить пользователя
async function updateUser(id, updateData) {
  try {
    const response = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });
    
    if (response.status === 200) {
      const user = await response.json();
      console.log(`Обновлен пользователь с ID ${id}:`, user);
      return user;
    } else {
      const error = await response.json();
      console.error('Ошибка при обновлении пользователя:', error);
    }
  } catch (error) {
    console.error('Ошибка при обновлении пользователя:', error);
  }
}

// 5. Удалить пользователя
async function deleteUser(id) {
  try {
    const response = await fetch(`${API_BASE}/users/${id}`, {
      method: 'DELETE',
    });
    
    if (response.status === 204) {
      console.log(`Пользователь с ID ${id} удален`);
      return true;
    } else {
      console.error(`Ошибка при удалении пользователя с ID ${id}`);
      return false;
    }
  } catch (error) {
    console.error('Ошибка при удалении пользователя:', error);
    return false;
  }
}

// 6. Поиск по email
async function searchByEmail(email) {
  try {
    const response = await fetch(`${API_BASE}/users/search/by-email?email=${encodeURIComponent(email)}`);
    const users = await response.json();
    console.log(`Пользователи с email ${email}:`, users);
    return users;
  } catch (error) {
    console.error('Ошибка при поиске по email:', error);
  }
}

// 7. Получить статистику
async function getUserStats() {
  try {
    const response = await fetch(`${API_BASE}/users/stats/count`);
    const stats = await response.json();
    console.log('Статистика пользователей:', stats);
    return stats;
  } catch (error) {
    console.error('Ошибка при получении статистики:', error);
  }
}

// Пример последовательности вызовов
async function runExamples() {
  console.log('=== Начало примеров использования Users API ===\n');
  
  // 1. Получить текущих пользователей
  await getAllUsers();
  
  // 2. Создать нового пользователя
  const newUser = await createUser({
    joomlaId: 999,
    email: 'example@test.com',
    username: 'testuser',
    settings: {
      theme: 'dark',
      language: 'ru'
    }
  });
  
  if (newUser) {
    // 3. Получить созданного пользователя
    await getUserById(newUser.joomlaId);
    
    // 4. Обновить пользователя
    await updateUser(newUser.joomlaId, {
      email: 'updated@test.com',
      settings: {
        theme: 'light',
        language: 'en'
      }
    });
    
    // 5. Поиск по email
    await searchByEmail('updated@test.com');
    
    // 6. Получить статистику
    await getUserStats();
    
    // 7. Удалить пользователя (раскомментировать при необходимости)
    // await deleteUser(newUser.joomlaId);
  }
  
  console.log('\n=== Конец примеров использования Users API ===');
}

// Запуск примеров
if (typeof window !== 'undefined') {
  // В браузере
  document.addEventListener('DOMContentLoaded', runExamples);
} else {
  // В Node.js
  runExamples().catch(console.error);
}

// Экспорт функций для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getAllUsers,
    createUser,
    getUserById,
    updateUser,
    deleteUser,
    searchByEmail,
    getUserStats,
    runExamples
  };
}