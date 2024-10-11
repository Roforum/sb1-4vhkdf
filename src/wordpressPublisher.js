import xmlrpc from 'xmlrpc';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

export async function postToWordPress(article) {
  const client = xmlrpc.createSecureClient({
    host: process.env.WORDPRESS_HOST,
    port: 443,
    path: '/xmlrpc.php',
  });

  const username = process.env.WORDPRESS_USERNAME;
  const password = process.env.WORDPRESS_PASSWORD;

  try {
    const categories = await getCategories(client, username, password);
    const categoryId = findRelevantCategory(categories, article.keywords);

    const imageUrl = await uploadFeaturedImage(client, username, password, article.title);

    const post = {
      post_type: 'post',
      post_title: article.title,
      post_content: formatContent(article),
      post_status: 'publish',
      terms: {
        category: [categoryId],
        post_tag: article.keywords,
      },
      post_thumbnail: imageUrl,
    };

    const postId = await new Promise((resolve, reject) => {
      client.methodCall('wp.newPost', [0, username, password, post], (error, value) => {
        if (error) reject(error);
        else resolve(value);
      });
    });

    console.log(`Article published successfully. Post ID: ${postId}`);
  } catch (error) {
    console.error('Error publishing to WordPress:', error);
  }
}

async function getCategories(client, username, password) {
  return new Promise((resolve, reject) => {
    client.methodCall('wp.getTerms', [0, username, password, 'category'], (error, categories) => {
      if (error) reject(error);
      else resolve(categories);
    });
  });
}

function findRelevantCategory(categories, keywords) {
  // Implement logic to find the most relevant category based on keywords
  // For now, we'll just return the first category or 'General' if none found
  return categories.length > 0 ? categories[0].term_id : 1;
}

async function uploadFeaturedImage(client, username, password, title) {
  const imagePath = await findRelevantImage(title);
  const imageData = await fs.readFile(imagePath);
  const optimizedImageBuffer = await sharp(imageData)
    .resize(1200, 630, { fit: 'inside' })
    .toBuffer();

  const imageFile = {
    name: path.basename(imagePath),
    type: 'image/jpeg',
    bits: optimizedImageBuffer,
  };

  return new Promise((resolve, reject) => {
    client.methodCall('wp.uploadFile', [0, username, password, imageFile], (error, response) => {
      if (error) reject(error);
      else resolve(response.url);
    });
  });
}

async function findRelevantImage(title) {
  // Implement logic to find a relevant image based on the title
  // For now, we'll just return a placeholder image path
  return 'path/to/placeholder-image.jpg';
}

function formatContent(article) {
  // Implement logic to format the article content with proper HTML structure
  // including H1, H2, H3, subtitles, and bold text
  return `
    <h1>${article.title}</h1>
    <p>${article.introduction}</p>
    <h2>Table of Contents</h2>
    <ul>
      ${article.tableOfContents.map(item => `<li>${item}</li>`).join('')}
    </ul>
    ${article.content}
    <h2>Final Opinion</h2>
    <p>${article.finalOpinion}</p>
  `;
}