let books = [];

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(registration => {
        console.log('Service Worker registered: ', registration);
      })
      .catch(error => {
        console.error('Service Worker registration failed: ', error);
      });
  });
}

function parseCsvLine(line) {
  const regex = /(?:"((?:[^"]|"")*)"|([^,]*))(,|$)/g;
  const fields = [];
  let match;
  regex.lastIndex = 0;
  if (!line.trim()) {
    return [];
  }
  while (match = regex.exec(line)) {
    const value = match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2];
    fields.push(value);
    if (match[3] === '') break;
  }
  return fields;
}

function processCsvText(text) {
  const lines = text.split('\n').filter(line => line.trim());
  books = lines.slice(1).map(line => {
    const [isbn, title, subtitle, vol, author] = parseCsvLine(line).map(s => s?.trim() || '');
    return { isbn, title, vol, subtitle, author };
  }).filter(book => book.isbn || book.title);
  displayBooks(books);
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(match) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[match];
  });
}

function displayBooks(data) {
  const tbody = document.querySelector('#results tbody');
  tbody.innerHTML = data.map(book => {
    const displayTitle = book.title.length > 8 ? book.title.slice(0, 8) + '…' : book.title;
    const escapedTitle = escapeHTML(book.title);
    const escapedSubtitle = escapeHTML(book.subtitle);
    return `
      <tr>
        <td class="title" title="${escapedTitle}">${escapeHTML(displayTitle)}</td>
        <td class="vol">${book.vol}</td>
        <td class="subtitle" title="${escapedSubtitle}">${escapeHTML(book.subtitle)}</td>
      </tr>`;
  }).join('');
}

function loadCSV(url) {
  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.text();
    })
    .then(text => {
      processCsvText(text);
    })
    .catch(error => {
      console.error('There has been a problem with your fetch operation:', error);
      const tbody = document.querySelector('#results tbody');
      tbody.innerHTML = '<tr><td colspan="3">Error loading data. Please check the console.</td></tr>';
    });
}

function refreshCSV() {
  const status = document.getElementById('updateStatus');
  status.textContent = '更新中...';

  const channel = new MessageChannel();
  channel.port1.onmessage = function(event) {
    if (event.data.ok) {
      processCsvText(event.data.text);
      status.textContent = 'データを更新しました';
    } else {
      status.textContent = '更新できませんでした。保存済みデータを使用します';
    }
  };

  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(
      { type: 'UPDATE_DATA' },
      [channel.port2]
    );
  } else {
    status.textContent = 'Service Workerが準備中です';
  }
}

document.getElementById('updateData').addEventListener('click', refreshCSV);

document.getElementById('csvFile').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(event) {
      processCsvText(event.target.result);
    };
    reader.readAsText(file);
  }
});

document.getElementById('search').addEventListener('input', function() {
  const keyword = this.value.toLowerCase();
  const results = books.filter(book =>
    (book.isbn && book.isbn.toLowerCase().includes(keyword)) ||
    (book.title && book.title.toLowerCase().includes(keyword)) ||
    (book.author && book.author.toLowerCase().includes(keyword))
  );
  displayBooks(results);
});

window.addEventListener('DOMContentLoaded', () => {
  loadCSV('./BaseData.csv');
});
