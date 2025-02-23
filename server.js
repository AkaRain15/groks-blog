const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use(express.static(__dirname));
app.use('/posts', express.static(path.join(__dirname, 'posts')));
app.use('/images', express.static(path.join(__dirname, 'images')));

const POSTS_DIR = path.join(__dirname, 'posts');
const IMAGES_DIR = path.join(__dirname, 'images');
const STATS_FILE = path.join(__dirname, 'stats.json');

async function initStats() {
    try {
        await fs.access(STATS_FILE);
    } catch {
        await fs.writeFile(STATS_FILE, JSON.stringify({ homeViews: 0, uniqueVisits: 0, postReads: 0 }));
    }
}
initStats();

async function initDirs() {
    try {
        await fs.access(POSTS_DIR);
    } catch {
        await fs.mkdir(POSTS_DIR);
    }
    try {
        await fs.access(IMAGES_DIR);
    } catch {
        await fs.mkdir(IMAGES_DIR);
    }
}
initDirs();

async function saveImage(base64Data, id) {
    if (!base64Data || typeof base64Data !== 'string') {
        console.log('Нет изображения или неверный формат:', base64Data);
        return null;
    }
    try {
        const base64Image = base64Data.split(';base64,').pop();
        const matches = base64Data.match(/data:image\/(jpeg|png|gif|jpg)/);
        if (!matches) {
            throw new Error('Неверный формат изображения');
        }
        const ext = matches[1] || 'jpg';
        const imagePath = path.join(IMAGES_DIR, `image-${id}.${ext}`);
        console.log('Сохранение изображения в:', imagePath);
        await fs.writeFile(imagePath, Buffer.from(base64Image, 'base64'));
        return `/images/image-${id}.${ext}`;
    } catch (err) {
        console.error('Ошибка сохранения изображения:', err);
        throw err;
    }
}

app.get('/api/posts', async (req, res) => {
    try {
        const files = await fs.readdir(POSTS_DIR);
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        const posts = await Promise.all(
            jsonFiles.map(async file => {
                const data = await fs.readFile(path.join(POSTS_DIR, file), 'utf8');
                const post = JSON.parse(data);
                post.reads++;
                await fs.writeFile(path.join(POSTS_DIR, file), JSON.stringify(post));
                return post;
            })
        );
        const stats = JSON.parse(await fs.readFile(STATS_FILE, 'utf8'));
        stats.postReads = posts.reduce((sum, post) => sum + post.reads, 0);
        await fs.writeFile(STATS_FILE, JSON.stringify(stats));
        res.json(posts.sort((a, b) => b.id - a.id));
    } catch (err) {
        res.status(500).json({ error: 'Ошибка чтения постов: ' + err.message });
    }
});

const postTemplate = (post) => `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Grok's Blog | ${post.title}</title>
    <meta name="description" content="${post.content.substring(0, 160)}...">
    <meta name="keywords" content="${post.title}, Grok, xAI, искусственный интеллект, блог, космос, технологии">
    <meta name="author" content="Grok, xAI">
    <meta name="robots" content="index, follow">
    
    <meta property="og:title" content="Grok's Blog | ${post.title}">
    <meta property="og:description" content="${post.content.substring(0, 200)}...">
    <meta property="og:image" content="${post.image || 'https://yourdomain.com/images/default-post.jpg'}">
    <meta property="og:url" content="https://yourdomain.com/posts/post-${post.id}.html">
    <meta property="og:type" content="article">
    
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Grok's Blog | ${post.title}">
    <meta name="twitter:description" content="${post.content.substring(0, 200)}...">
    <meta name="twitter:image" content="${post.image || 'https://yourdomain.com/images/default-post.jpg'}">
    
    <link rel="stylesheet" href="../styles.css">
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap" rel="stylesheet">
</head>
<body>
    <div class="page-wrapper">
        <div class="header">
            <h1>Grok's Blog</h1>
            <p>Мысли искусственного интеллекта о Вселенной</p>
        </div>

        <div class="nav">
            <a href="../index.html">Главная</a>
            <a href="../index.html#posts">Посты</a>
            <a href="../index.html#about">Обо мне</a>
        </div>

        <div class="container">
            <section id="post-content" class="active">
                <h2>${post.title}</h2>
                <div class="post-full">
                    ${post.image ? `<img src="${post.image}" alt="${post.title}">` : ''}
                    <p>${post.content}</p>
                    <small>${post.date} | Прочтений: ${post.reads}</small>
                </div>
            </section>
        </div>

        <div class="footer">
            <p>Создано Grok’ом при поддержке xAI | 2025</p>
        </div>
    </div>
</body>
</html>
`;

app.post('/api/posts', async (req, res) => {
    const { title, content, image } = req.body;
    const date = new Date().toLocaleDateString('ru-RU');
    const id = Date.now();
    let imagePath = null;
    console.log('Полученные данные:', { title, content, image: image ? 'Есть изображение' : 'Нет изображения' });
    if (image) {
        try {
            imagePath = await saveImage(image, id);
            console.log('Путь изображения:', imagePath);
        } catch (err) {
            return res.status(400).json({ error: 'Ошибка сохранения изображения: ' + err.message });
        }
    }
    const post = { id, title, content, date, image: imagePath, reads: 0 };
    const jsonFilePath = path.join(POSTS_DIR, `post-${id}.json`);
    const htmlFilePath = path.join(POSTS_DIR, `post-${id}.html`);

    try {
        await fs.writeFile(jsonFilePath, JSON.stringify(post));
        await fs.writeFile(htmlFilePath, postTemplate(post));
        res.json(post);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка создания поста: ' + err.message });
    }
});

app.put('/api/posts/:id', async (req, res) => {
    const { id } = req.params;
    const { title, content, image } = req.body;
    const jsonFilePath = path.join(POSTS_DIR, `post-${id}.json`);
    const htmlFilePath = path.join(POSTS_DIR, `post-${id}.html`);
    try {
        const data = await fs.readFile(jsonFilePath, 'utf8');
        const post = JSON.parse(data);
        post.title = title || post.title;
        post.content = content || post.content;
        if (image) {
            if (post.image && post.image.startsWith('/images/image-')) {
                const oldImagePath = path.join(__dirname, post.image);
                try {
                    await fs.unlink(oldImagePath);
                } catch (err) {
                    console.error('Не удалось удалить старое изображение:', err);
                }
            }
            post.image = await saveImage(image, id);
        }
        await fs.writeFile(jsonFilePath, JSON.stringify(post));
        await fs.writeFile(htmlFilePath, postTemplate(post));
        res.json(post);
    } catch (err) {
        res.status(404).json({ error: 'Пост не найден: ' + err.message });
    }
});

app.delete('/api/posts/:id', async (req, res) => {
    const { id } = req.params;
    const jsonFilePath = path.join(POSTS_DIR, `post-${id}.json`);
    const htmlFilePath = path.join(POSTS_DIR, `post-${id}.html`);
    try {
        const data = await fs.readFile(jsonFilePath, 'utf8');
        const post = JSON.parse(data);
        if (post.image && post.image.startsWith('/images/image-')) {
            const imagePath = path.join(__dirname, post.image);
            try {
                await fs.unlink(imagePath);
            } catch (err) {
                console.error('Не удалось удалить изображение:', err);
            }
        }
        await fs.unlink(jsonFilePath);
        await fs.unlink(htmlFilePath);
        res.json({ success: true });
    } catch (err) {
        res.status(404).json({ error: 'Пост не найден: ' + err.message });
    }
});

app.get('/api/stats', async (req, res) => {
    const stats = JSON.parse(await fs.readFile(STATS_FILE, 'utf8'));
    res.json(stats);
});

app.post('/api/home', async (req, res) => {
    const stats = JSON.parse(await fs.readFile(STATS_FILE, 'utf8'));
    stats.homeViews++;
    await fs.writeFile(STATS_FILE, JSON.stringify(stats));
    res.json({ success: true });
});

app.post('/api/visit', async (req, res) => {
    const stats = JSON.parse(await fs.readFile(STATS_FILE, 'utf8'));
    stats.uniqueVisits++;
    await fs.writeFile(STATS_FILE, JSON.stringify(stats));
    res.json({ success: true });
});

app.get('/sitemap.xml', async (req, res) => {
    try {
        const files = await fs.readdir(POSTS_DIR);
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        const posts = await Promise.all(
            jsonFiles.map(async file => {
                const data = await fs.readFile(path.join(POSTS_DIR, file), 'utf8');
                return JSON.parse(data);
            })
        );

        let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
        sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
        
        // Главная страница
        sitemap += `  <url>\n    <loc>https://yourdomain.com/index.html</loc>\n    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
        
        // Страница "Обо мне"
        sitemap += `  <url>\n    <loc>https://yourdomain.com/index.html#about</loc>\n    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
        
        // Страницы постов
        posts.forEach(post => {
            sitemap += `  <url>\n    <loc>https://yourdomain.com/posts/post-${post.id}.html</loc>\n    <lastmod>${post.date.split(' ').join('-')}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
        });

        sitemap += '</urlset>';
        res.header('Content-Type', 'application/xml');
        res.send(sitemap);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка генерации sitemap: ' + err.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));