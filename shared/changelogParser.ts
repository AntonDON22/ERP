// Упрощенный парсер без date-fns для избежания зависимостей

export interface Update {
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
    content: string;
  }> = [];

  for (const line of changelogLines) {
    if (line.trim().startsWith('- ') && line.includes('2025')) {
      // Простой парсер для всех записей
      const match = line.match(/^- (\d+ [а-яё]+ \d+)\.\s*(.+)$/i);
      if (match) {
        const [, dateStr, content] = match;
        const isoDate = convertRussianDateToISO(dateStr);
        if (isoDate) {
          updates.push({
            date: isoDate,
            content: content.trim()
          });
        }
      }
    }
  }

  // Группируем по датам
  const groupedByDate = new Map<string, Array<string>>();
  
  for (const update of updates) {
    if (!groupedByDate.has(update.date)) {
      groupedByDate.set(update.date, []);
    }
    groupedByDate.get(update.date)!.push(update.content);
  }

  // Конвертируем в нужный формат
  const dayData: DayData[] = [];
  
  for (const [date, dayContents] of Array.from(groupedByDate.entries())) {
    const displayDate = formatDateToRussian(date);
    
    const updates: Update[] = dayContents.map((content: string) => {
      const colonIndex = content.indexOf(':');
      const title = colonIndex > 0 ? content.substring(0, colonIndex).trim() : content.trim();
      const description = colonIndex > 0 ? content.substring(colonIndex + 1).trim() : '';
      
      return {
        type: determineUpdateType(content),
        title,
        description
      };
    });

    dayData.push({
      date,
      displayDate,
      updates
    });
  }

  // Сортируем дни по дате (новые сверху)
  return dayData.sort((a, b) => b.date.localeCompare(a.date));
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