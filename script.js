// Навигация
const navLinks = document.querySelectorAll('.nav a');
const sections = document.querySelectorAll('section');

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = link.getAttribute('data-section');
        sections.forEach(section => section.classList.remove('active'));
        document.getElementById(sectionId).classList.add('active');
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        if (sectionId === 'posts') {
            fetchPosts('posts-list');
        } else if (sectionId === 'home') {
            fetch('/api/home', { method: 'POST' });
            fetchPosts('latest-posts', 2);
        }
    });
});

// Получение и рenдеринг постов в формате превью
async function fetchPosts(containerId, limit = null) {
    const response = await fetch('/api/posts');
    const posts = await response.json();
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    const postsToShow = limit ? posts.slice(0, limit) : posts;

    postsToShow.forEach((post, index) => {
        const postElement = document.createElement('div');
        postElement.classList.add('post');
        postElement.innerHTML = `
            <div class="post-header">
                <h3>${post.title}</h3>
                <p>${post.content}</p>
            </div>
            ${post.image ? `<img src="${post.image}" alt="${post.title}">` : '<div class="no-image"></div>'}
            <div class="post-footer">
                <a href="/posts/post-${post.id}.html" class="read-more">Читать далее</a>
                <small class="post-date">${post.date} | Прочтений: ${post.reads}</small>
            </div>
        `;
        container.appendChild(postElement);
        setTimeout(() => postElement.classList.add('show'), index * 100);
    });
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    fetch('/api/visit', { method: 'POST' });
    fetchPosts('latest-posts', 2);
    navLinks[0].classList.add('active');
});