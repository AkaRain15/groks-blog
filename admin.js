// Пароль для админки
const ADMIN_PASSWORD = "Kaori1511!";

// Вход в админку
function loginAdmin() {
    const password = document.getElementById('admin-password').value;
    if (password === ADMIN_PASSWORD) {
        document.getElementById('admin-auth').style.display = 'none';
        document.getElementById('admin-content').style.display = 'block';
        fetchStats();
        fetchPostsForEdit();
        fetchPostsForDelete();
    } else {
        alert('Неверный пароль!');
    }
}

// Добавление поста
async function addPost() {
    const title = document.getElementById('post-title').value;
    const content = document.getElementById('post-content').value;
    const imageInput = document.getElementById('post-image');

    let imageData = null;
    if (imageInput.files[0]) {
        const reader = new FileReader();
        reader.onload = async () => {
            imageData = reader.result;
            console.log('Изображение для создания поста:', imageData.substring(0, 50) + '...'); // Логируем начало base64
            const post = { title, content, image: imageData };
            try {
                const response = await fetch('/api/posts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(post)
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Ошибка создания поста');
                alert('Пост добавлен!');
                clearAddForm();
                fetchPostsForEdit();
                fetchPostsForDelete();
            } catch (err) {
                alert('Ошибка: ' + err.message);
            }
        };
        reader.readAsDataURL(imageInput.files[0]);
    } else {
        const post = { title, content, image: null };
        try {
            const response = await fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(post)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Ошибка создания поста');
            alert('Пост добавлен!');
            clearAddForm();
            fetchPostsForEdit();
            fetchPostsForDelete();
        } catch (err) {
            alert('Ошибка: ' + err.message);
        }
    }
}

// Очистка формы добавления
function clearAddForm() {
    document.getElementById('post-title').value = '';
    document.getElementById('post-content').value = '';
    document.getElementById('post-image').value = '';
}

// Загрузка постов для редактирования
async function fetchPostsForEdit() {
    const response = await fetch('/api/posts');
    const posts = await response.json();
    const container = document.getElementById('edit-posts');
    container.innerHTML = '';

    posts.forEach(post => {
        const postElement = document.createElement('div');
        postElement.classList.add('edit-post');
        postElement.innerHTML = `
            <input type="text" class="edit-title" value="${post.title}">
            <textarea class="edit-content">${post.content}</textarea>
            ${post.image ? `<img src="${post.image}" alt="${post.title}">` : ''}
            <input type="file" class="edit-image" accept="image/*">
            <button onclick="savePost('${post.id}')">Сохранить</button>
        `;
        container.appendChild(postElement);
    });
}

// Сохранение отредактированного поста
async function savePost(postId) {
    const postElement = document.querySelector(`.edit-post button[onclick="savePost('${postId}')"]`).parentElement;
    const title = postElement.querySelector('.edit-title').value;
    const content = postElement.querySelector('.edit-content').value;
    const imageInput = postElement.querySelector('.edit-image');

    let imageData = null;
    if (imageInput.files[0]) {
        const reader = new FileReader();
        reader.onload = async () => {
            imageData = reader.result;
            console.log('Изображение для редактирования поста:', imageData.substring(0, 50) + '...');
            const post = { title, content, image: imageData };
            try {
                const response = await fetch(`/api/posts/${postId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(post)
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Ошибка редактирования поста');
                alert('Пост обновлён!');
                fetchPostsForEdit();
                fetchPostsForDelete();
            } catch (err) {
                alert('Ошибка: ' + err.message);
            }
        };
        reader.readAsDataURL(imageInput.files[0]);
    } else {
        const post = { title, content };
        try {
            const response = await fetch(`/api/posts/${postId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(post)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Ошибка редактирования поста');
            alert('Пост обновлён!');
            fetchPostsForEdit();
            fetchPostsForDelete();
        } catch (err) {
            alert('Ошибка: ' + err.message);
        }
    }
}

// Загрузка постов для удаления
async function fetchPostsForDelete() {
    const response = await fetch('/api/posts');
    const posts = await response.json();
    const container = document.getElementById('delete-posts');
    container.innerHTML = '';

    posts.forEach(post => {
        const postElement = document.createElement('div');
        postElement.classList.add('delete-post');
        postElement.innerHTML = `
            <span>${post.title}</span>
            <button onclick="deletePost('${post.id}')">Удалить</button>
        `;
        container.appendChild(postElement);
    });
}

// Удаление поста
async function deletePost(postId) {
    if (confirm('Вы уверены, что хотите удалить этот пост?')) {
        try {
            const response = await fetch(`/api/posts/${postId}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Ошибка удаления поста');
            alert('Пост удалён!');
            fetchPostsForEdit();
            fetchPostsForDelete();
        } catch (err) {
            alert('Ошибка: ' + err.message);
        }
    }
}

// Получение аналитики
async function fetchStats() {
    const response = await fetch('/api/stats');
    const stats = await response.json();
    document.getElementById('home-views').textContent = stats.homeViews;
    document.getElementById('unique-visits').textContent = stats.uniqueVisits;
    document.getElementById('post-reads').textContent = stats.postReads;
}

// Привязка событий
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('publish-btn').addEventListener('click', addPost);
});