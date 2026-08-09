import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

const oldHackPhotos = `        const hackPhotos = [
          "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600",
          "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600",
          "https://images.unsplash.com/photo-1510511459019-5efa7724fd86?w=600",
          "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600"
        ];`;

const newHackPhotos = `        const hackPhotos = [
          "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600",
          "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600",
          "https://images.unsplash.com/photo-1510511459019-5efa7724fd86?w=600",
          "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600",
          "https://images.unsplash.com/photo-1614064641913-a520faff82b1?w=600",
          "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=600",
          "https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?w=600"
        ];`;

code = code.replace(oldHackPhotos, newHackPhotos);
fs.writeFileSync('server.ts', code);
