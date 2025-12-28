// Общие функции для всего сайта
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    const oldNotifications = document.querySelectorAll('.notification');
    oldNotifications.forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    const icons = { 
        'success': 'check-circle', 
        'error': 'exclamation-circle', 
        'warning': 'exclamation-triangle', 
        'info': 'info-circle' 
    };
    notification.innerHTML = `<i class="fas fa-${icons[type] || 'info-circle'}"></i><span>${message}</span>`;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function getGameName(gameCode) {
    const games = {
        'cs2': 'Counter-Strike 2',
        'dota2': 'Dota 2',
        'valorant': 'Valorant',
        'lol': 'League of Legends'
    };
    return games[gameCode] || gameCode;
}

function getRoleName(roleCode) {
    const roles = {
        'captain': 'Капитан',
        'player': 'Игрок',
        'substitute': 'Запасной'
    };
    return roles[roleCode] || roleCode;
}

function formatDate(dateString) {
    if (!dateString) return 'Не указана';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
}

function checkAuth() {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
        const user = JSON.parse(currentUser);
        const userElement = document.getElementById('currentUser');
        if (userElement) {
            userElement.textContent = user.nickname || user.username;
        }
        return user;
    }
    return null;
}

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// Функции для работы с модальными окнами
function showAuthModal() {
    closeModal('registerModal');
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.add('active');
}

function showRegisterModal() {
    closeModal('authModal');
    const modal = document.getElementById('registerModal');
    if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

// Закрытие модальных окон при клике вне их
window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
});

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Инициализируем базу данных
    if (typeof Database !== 'undefined') {
        const db = new Database();
        db.init();
    }
    
    // Проверяем авторизацию
    checkAuth();
    
    // Настраиваем формы авторизации если они есть
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;
            
            const db = new Database();
            const users = db.getAllUsers();
            const user = users.find(u => u.username === username);
            
            if (!user) {
                showNotification('Пользователь не найден', 'error');
                return;
            }
            
            if (user.password !== password) {
                showNotification('Неверный пароль', 'error');
                return;
            }
            
            localStorage.setItem('currentUser', JSON.stringify(user));
            showNotification('Вход выполнен успешно!', 'success');
            closeModal('authModal');
            
            // Обновляем интерфейс
            const userElement = document.getElementById('currentUser');
            if (userElement) {
                userElement.textContent = user.nickname || user.username;
            }
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        });
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('regUsername').value;
            const email = document.getElementById('regEmail').value;
            const nickname = document.getElementById('regNickname').value;
            const password = document.getElementById('regPassword').value;
            const confirmPassword = document.getElementById('regConfirmPassword').value;
            
            if (username.length < 3 || username.length > 20) {
                showNotification('Логин должен быть 3-20 символов', 'error');
                return;
            }
            
            if (!email.includes('@')) {
                showNotification('Введите корректный email', 'error');
                return;
            }
            
            if (password.length < 6) {
                showNotification('Пароль должен быть минимум 6 символов', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                showNotification('Пароли не совпадают', 'error');
                return;
            }
            
            const db = new Database();
            const users = db.getAllUsers();
            
            if (users.find(u => u.username === username)) {
                showNotification('Этот логин уже занят', 'error');
                return;
            }
            
            if (users.find(u => u.email === email)) {
                showNotification('Этот email уже зарегистрирован', 'error');
                return;
            }
            
            const newUser = {
                id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                username: username,
                email: email,
                password: password,
                nickname: nickname,
                role: 'user',
                createdAt: new Date().toISOString(),
                isVerified: false,
                hasTeam: false,
                teamId: null
            };
            
            users.push(newUser);
            db.saveToFile('users.json', users);
            
            localStorage.setItem('currentUser', JSON.stringify(newUser));
            showNotification('Регистрация успешна!', 'success');
            closeModal('registerModal');
            
            const userElement = document.getElementById('currentUser');
            if (userElement) {
                userElement.textContent = newUser.nickname;
            }
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        });
    }
});