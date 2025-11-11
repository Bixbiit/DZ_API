import express, { Request, Response } from 'express';

const app = express();
app.use(express.json()); // для парсинга JSON тела запросов

// Вспомогательные константы
const availableResolutions = [
  "P144", "P240", "P360", "P480", "P720", "P1080", "P1440", "P2160"
];

interface Video {
  id: string;
  title: string;
  description?: string;
  date: string; // ISO string
  availableResolutions: string[]; // enum
}

// Временная "база данных"
const videos: Record<string, Video> = {};

// Вспомогательная функция генерации ID
const generateId = (): string => Math.random().toString(36).substr(2, 9);

// Валидация входных данных для создания/обновления видео
function validateVideoInput(input: any, isUpdate = false): { valid: boolean, errors: string[] } {
  const errors: string[] = [];

  if (!isUpdate || ('title' in input)) {
    if (typeof input.title !== 'string' || input.title.trim() === '') {
      errors.push('Invalid or missing "title"');
    }
  }

  if ('description' in input) {
    if (typeof input.description !== 'string') {
      errors.push('Invalid "description"');
    }
  }

  if (!isUpdate || ('date' in input)) {
    if (typeof input.date !== 'string' || isNaN(Date.parse(input.date))) {
      errors.push('Invalid or missing "date", должно быть в формате ISO');
    }
  }

  if ('availableResolutions' in input) {
    if (!Array.isArray(input.availableResolutions)) {
      errors.push('"availableResolutions" должно быть массивом строк');
    } else {
      for (const res of input.availableResolutions) {
        if (!availableResolutions.includes(res)) {
          errors.push(`Недопустимое значение "availableResolutions": ${res}`);
        }
      }
    }
  } else if (!isUpdate) {
    // при создании обязательно должно быть поле availableResolutions
    errors.push('Отсутствует "availableResolutions"');
  }

  return { valid: errors.length === 0, errors };
}

// маршрут для получения всех видео
app.get('/videos', (req: Request, res: Response) => {
  res.json(Object.values(videos));
});

// маршрут для получения видео по id
app.get('/videos/:id', (req: Request, res: Response) => {
  const v = videos[req.params.id];
  if (v) {
    res.json(v);
  } else {
    res.status(404).send({ message: 'Видео не найдено' });
  }
});

// создание нового видео
app.post('/videos', (req: Request, res: Response) => {
  const { body } = req;
  const { valid, errors } = validateVideoInput(body);
  if (!valid) {
    return res.status(400).json({ errors });
  }

  const id = generateId();
  const newVideo: Video = {
    id,
    title: body.title,
    description: body.description,
    date: new Date(body.date).toISOString(),
    availableResolutions: body.availableResolutions
  };
  videos[id] = newVideo;
  res.status(201).json(newVideo);
});

// обновление видео по id
app.put('/videos/:id', (req: Request, res: Response) => {
  const existingVideo = videos[req.params.id];
  if (!existingVideo) {
    return res.status(404).send({ message: 'Видео не найдено' });
  }

  const { body } = req;
  const { valid, errors } = validateVideoInput(body, true);
  if (!valid) {
    return res.status(400).json({ errors });
  }

  // Обновляем только переданные поля
  if ('title' in body) {
    existingVideo.title = body.title;
  }
  if ('description' in body) {
    existingVideo.description = body.description;
  }
  if ('date' in body) {
    existingVideo.date = new Date(body.date).toISOString();
  }
  if ('availableResolutions' in body) {
    existingVideo.availableResolutions = body.availableResolutions;
  }

  res.json(existingVideo);
});

// удаление видео по id
app.delete('/videos/:id', (req: Request, res: Response) => {
  if (videos[req.params.id]) {
    delete videos[req.params.id];
    res.status(204).send();
  } else {
    res.status(404).send({ message: 'Видео не найдено' });
  }
});

// очистка базы данных
app.delete('/testing/all-data', (_req, res) => {
  for (const key in videos) {
    delete videos[key];
  }
  res.status(204).send();
});

// запуск сервера
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});