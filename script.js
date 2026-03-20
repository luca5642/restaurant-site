const SHEET_ID = '1vtvqsDQu7hsgy4nySfI01HkwaBVSfz7CfMJbkPe2-LU';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

let allRestaurants = [];

async function loadData() {
    try {
        const response = await fetch(SHEET_URL);
        const text = await response.text();
        // gvizのレスポンスはJSONの前後にラッパーがあるので取り除く
        const json = JSON.parse(text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)/)[1]);
        allRestaurants = parseGviz(json);
        populateGenreFilter();
        renderCards(allRestaurants);
        document.getElementById('loading').style.display = 'none';
    } catch (error) {
        document.getElementById('loading').textContent = 'データの読み込みに失敗しました。スプレッドシートの共有設定を確認してください。';
    }
}

// gviz JSONをオブジェクトの配列に変換
function parseGviz(json) {
    const rows = json.table.rows;
    return rows.map(row => {
        const c = row.c || [];
        const val = (i) => (c[i] && c[i].v != null) ? String(c[i].v) : '';
        return {
            name:     val(0),
            genre:    val(1),
            location: val(2),
            rating:   Math.min(5, Math.max(0, parseInt(val(3)) || 0)),
            comment:  val(4),
            photo:    val(5),
            url:      val(6),
        };
    }).filter(r => r.name.trim() !== '');
}

// 星を表示
function starsHTML(rating) {
    return '<span class="star-filled">' + '★'.repeat(rating) + '</span>' +
           '<span class="star-empty">' + '☆'.repeat(5 - rating) + '</span>';
}

// カードを描画
function renderCards(restaurants) {
    const grid = document.getElementById('cards');
    const empty = document.getElementById('empty');

    if (restaurants.length === 0) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    grid.innerHTML = restaurants.map(r => `
        <div class="card">
            ${r.photo
                ? `<img class="card-image" src="${r.photo}" alt="${escapeHTML(r.name)}" loading="lazy" onerror="this.outerHTML='<div class=\\"card-image-placeholder\\">🍽</div>'">`
                : `<div class="card-image-placeholder">🍽</div>`
            }
            <div class="card-body">
                <div class="card-header">
                    <div class="card-name">${escapeHTML(r.name)}</div>
                    <div class="stars">${starsHTML(r.rating)}</div>
                </div>
                <div class="card-meta">
                    ${r.genre    ? `<span class="tag">${escapeHTML(r.genre)}</span>` : ''}
                    ${r.location ? `<span class="tag">📍 ${escapeHTML(r.location)}</span>` : ''}
                </div>
                ${r.comment ? `<div class="card-comment">${escapeHTML(r.comment)}</div>` : ''}
                ${r.url ? `<a class="card-link" href="${r.url}" target="_blank" rel="noopener noreferrer">食べログを見る →</a>` : ''}
            </div>
        </div>
    `).join('');
}

// ジャンルフィルターの選択肢を生成
function populateGenreFilter() {
    const genres = [...new Set(allRestaurants.map(r => r.genre).filter(Boolean))].sort();
    const select = document.getElementById('genre-filter');
    genres.forEach(genre => {
        const option = document.createElement('option');
        option.value = genre;
        option.textContent = genre;
        select.appendChild(option);
    });
}

// 検索・フィルター
function filterRestaurants() {
    const search = document.getElementById('search').value.toLowerCase();
    const genre = document.getElementById('genre-filter').value;

    const filtered = allRestaurants.filter(r => {
        const matchSearch = !search ||
            r.name.toLowerCase().includes(search) ||
            r.location.toLowerCase().includes(search);
        const matchGenre = !genre || r.genre === genre;
        return matchSearch && matchGenre;
    });

    renderCards(filtered);
}

// XSS対策
function escapeHTML(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

document.getElementById('search').addEventListener('input', filterRestaurants);
document.getElementById('genre-filter').addEventListener('change', filterRestaurants);

loadData();
