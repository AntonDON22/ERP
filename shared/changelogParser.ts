// Упрощенный парсер без date-fns для избежания зависимостей

export interface Update {
  time: string;
  type: "feature" | "fix" | "improvement" | "database";
  title: string;
  description: string;
}

export interface DayData {
  date: string;
  displayDate: string;
  updates: Update[];
}

function convertDateToISO(dateStr: string): string | null {
  try {
    // Конвертируем "July 1, 2025" в ISO формат "2025-07-01"
    const months: Record<string, string> = {
      January: '01', February: '02', March: '03', April: '04', May: '05', June: '06',
      July: '07', August: '08', September: '09', October: '10', November: '11', December: '12'
    };
    
    const match = dateStr.match(/^([A-Za-z]+) (\d+), (\d+)$/);
    if (!match) return null;
    
    const [, monthName, day, year] = match;
    const monthNum = months[monthName];
    
    if (!monthNum) return null;
    
    const dayPadded = day.padStart(2, '0');
    return `${year}-${monthNum}-${dayPadded}`;
  } catch {
    return null;
  }
}

function convertRussianDateToISO(dateStr: string): string | null {
  try {
    // Конвертируем "1 июля 2025" в ISO формат "2025-07-01"
    const months: Record<string, string> = {
      'января': '01', 'февраля': '02', 'марта': '03', 'апреля': '04', 'мая': '05', 'июня': '06',
      'июля': '07', 'августа': '08', 'сентября': '09', 'октября': '10', 'ноября': '11', 'декабря': '12'
    };
    
    const match = dateStr.match(/^(\d+) ([а-яё]+) (\d+)$/i);
    if (!match) return null;
    
    const [, day, monthName, year] = match;
    const monthNum = months[monthName.toLowerCase()];
    
    if (!monthNum) return null;
    
    const dayPadded = day.padStart(2, '0');
    return `${year}-${monthNum}-${dayPadded}`;
  } catch {
    return null;
  }
}

function formatDateToRussian(isoDate: string): string {
  try {
    // Конвертируем "2025-07-01" в "1 июля 2025"
    const months = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    
    const [year, month, day] = isoDate.split('-');
    const monthIndex = parseInt(month) - 1;
    const dayNum = parseInt(day);
    
    return `${dayNum} ${months[monthIndex]} ${year}`;
  } catch {
    return isoDate;
  }
}

export function parseChangelogFromReplit(replitContent: string): DayData[] {
  const lines = replitContent.split('\n');
  const changelogStart = lines.findIndex(line => line.includes('## История изменений') || line.includes('## Changelog'));
  
  if (changelogStart === -1) {
    return [];
  }
  
  const changelogLines = lines.slice(changelogStart + 1);
  const updates: Array<{
    date: string;
    time: string;
    content: string;
  }> = [];
  let updateIndex = 0; // Счетчик для генерации уникального времени

  for (const line of changelogLines) {
    if (line.trim().startsWith('- ') && line.includes('2025')) {
      // Парсим строку вида: "- 1 июля 2025. Заголовок: Описание" или "- July 1, 2025. Title: Description"
      const russianMatch = line.match(/^- (\d+ [а-яё]+ \d+)\.\s*(.+?):\s*(.+)$/i);
      const englishMatch = line.match(/^- ([A-Za-z]+ \d+, \d+)\.\s*(.+?):\s*(.+)$/);
      
      if (russianMatch) {
        const [, dateStr, title, description] = russianMatch;
        
        // Конвертируем русскую дату в ISO формат
        const isoDate = convertRussianDateToISO(dateStr);
        if (isoDate) {
          const time = extractTimeFromDescription(description || title, updateIndex++);
          
          updates.push({
            date: isoDate,
            time,
            content: `${title}: ${description || ''}`
          });
        }
      } else if (englishMatch) {
        const [, dateStr, title, description] = englishMatch;
        
        // Конвертируем английскую дату в ISO формат
        const isoDate = convertDateToISO(dateStr);
        if (isoDate) {
          const time = extractTimeFromDescription(description || title, updateIndex++);
          
          updates.push({
            date: isoDate,
            time,
            content: `${title}: ${description || ''}`
          });
        }
      } else {
        // Упрощенное сопоставление для записей без строгого формата
        const simpleMatch = line.match(/^- (\d+ [а-яё]+ \d+)\.\s*(.+)$/i);
        if (simpleMatch) {
          const [, dateStr, content] = simpleMatch;
          const isoDate = convertRussianDateToISO(dateStr);
          if (isoDate) {
            const colonIndex = content.indexOf(':');
            const title = colonIndex > 0 ? content.substring(0, colonIndex).trim() : content.substring(0, 50) + '...';
            const description = colonIndex > 0 ? content.substring(colonIndex + 1).trim() : content;
            const time = extractTimeFromDescription(description, updateIndex++);
            
            updates.push({
              date: isoDate,
              time,
              content: `${title}: ${description}`
            });
          }
        }
      }
    }
  }

  // Группируем по датам
  const groupedByDate = new Map<string, Array<{time: string, content: string}>>();
  
  for (const update of updates) {
    if (!groupedByDate.has(update.date)) {
      groupedByDate.set(update.date, []);
    }
    groupedByDate.get(update.date)!.push({
      time: update.time,
      content: update.content
    });
  }

  // Конвертируем в нужный формат
  const dayData: DayData[] = [];
  
  for (const [date, dayUpdates] of Array.from(groupedByDate.entries())) {
    const displayDate = formatDateToRussian(date);
    
    const updates: Update[] = dayUpdates
      .map((update: {time: string, content: string}, index: number) => ({
        time: update.time,
        type: determineUpdateType(update.content),
        title: extractTitle(update.content),
        description: extractDescription(update.content)
      }))
      .sort((a, b) => b.time.localeCompare(a.time)); // Сортируем по времени после генерации

    dayData.push({
      date,
      displayDate,
      updates
    });
  }

  // Сортируем дни по дате (новые сверху)
  return dayData.sort((a, b) => b.date.localeCompare(a.date));
}

function extractTimeFromDescription(description: string, index: number = 0): string {
  // Попытка извлечь время из описания (если есть упоминания времени)
  const timeMatch = description.match(/(\d{1,2}:\d{2})/);
  if (timeMatch) {
    return timeMatch[1];
  }
  
  // Фиксированное время на основе индекса записи для стабильности
  // Новые записи (малый индекс) должны иметь более позднее время
  const currentHour = 22; // Текущий час
  const currentMinute = 30; // Текущая минута
  
  // Генерируем время в обратном порядке - новые записи ближе к текущему времени
  const minutesAgo = index * 5; // Каждая запись на 5 минут раньше
  const totalMinutes = (currentHour * 60 + currentMinute) - minutesAgo;
  
  if (totalMinutes < 0) {
    // Если время уходит в прошлые сутки, начинаем с утра
    const morningMinutes = 540 + (index % 60); // 9:00 + случайные минуты
    const hours = Math.floor(morningMinutes / 60);
    const minutes = morningMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function determineUpdateType(content: string): "feature" | "fix" | "improvement" | "database" {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('база данных') || lowerContent.includes('database') || 
      lowerContent.includes('материализованные') || lowerContent.includes('sql') ||
      lowerContent.includes('postgresql') || lowerContent.includes('drizzle')) {
    return 'database';
  }
  
  if (lowerContent.includes('исправ') || lowerContent.includes('fix') || 
      lowerContent.includes('решена') || lowerContent.includes('устранен') ||
      lowerContent.includes('ошибк') || lowerContent.includes('баг')) {
    return 'fix';
  }
  
  if (lowerContent.includes('создан') || lowerContent.includes('добавлен') || 
      lowerContent.includes('реализован') || lowerContent.includes('новый') ||
      lowerContent.includes('модуль') || lowerContent.includes('функциональность')) {
    return 'feature';
  }
  
  return 'improvement';
}

function extractTitle(content: string): string {
  const colonIndex = content.indexOf(':');
  if (colonIndex === -1) return content.slice(0, 80) + '...';
  
  return content.slice(0, colonIndex).trim();
}

function extractDescription(content: string): string {
  const colonIndex = content.indexOf(':');
  if (colonIndex === -1) return content;
  
  return content.slice(colonIndex + 1).trim();
}