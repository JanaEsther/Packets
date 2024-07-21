//Datový model pro data z API
interface Packet {
  from: string;
  to: string;
  payload: string;
  stamp: number;
}

interface Email {
  from: string;
  to: string;
  payload: string[];
}

//Prioritní fronta
class PriorityQueue<T> {
  private items: { element: T; priority: number }[] = [];

  enqueue(element: T, priority: number) {
    const queueElement = { element, priority };
    let added = false;

    for (let i = 0; i < this.items.length; i++) {
      if (queueElement.priority < this.items[i].priority) {
        this.items.splice(i, 0, queueElement);
        added = true;
        break;
      }
    }

    if (!added) {
      this.items.push(queueElement);
    }
  }

  dequeue(): T | undefined {
    return this.items.shift()?.element;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

//Načítání paketů z API
async function fetchPackets(): Promise<Packet[]> {
  try {
    const response = await fetch('http://localhost:4000/packets');
    if (!response.ok) {
      throw new Error(`Error fetching packets: ${response.statusText}`);
    }
    return response.json();
  } catch (error) {
    console.error('Failed to fetch packets:', error);
    return [];
  }
}
//Skládání e-mailů z paketů
function assembleEmails(packets: Packet[]): Email[] {
  const emails: { [key: string]: { from: string; to: string; payload: string[]; stamps: number[] } } = {};
  const priorityQueue = new PriorityQueue<Packet>();

//Přidání paketů do prioritné fronty
  packets.forEach(packet => priorityQueue.enqueue(packet, packet.stamp));

// Zpracování paketů z fronty a sestavení e-mailů
  while (!priorityQueue.isEmpty()) {
    const packet = priorityQueue.dequeue()!;
    const emailKey = `${packet.from}-${packet.to}`;

    if (!emails[emailKey]) {
      emails[emailKey] = {
        from: packet.from,
        to: packet.to,
        payload: [],
        stamps: []
      };
    }

    emails[emailKey].payload.push(packet.payload);
    emails[emailKey].stamps.push(packet.stamp);
  }

  // Seřazení podle stamp v každém paketu a odstranění stamp
  return Object.values(emails).map(email => {
    const sortedPayloads = email.payload
      .map((payload, index) => ({ payload, stamp: email.stamps[index] }))
      .sort((a, b) => a.stamp - b.stamp)
      .map(item => item.payload);

    return { from: email.from, to: email.to, payload: sortedPayloads };
  });
}


//Zobrazení e-mailů na stránce
function displayEmails(emails: Email[]) {
  const emailsDiv = document.getElementById('emails');
  if (!emailsDiv) {
    console.error('Emails div not found');
    return;
  }

  emailsDiv.innerHTML = '';

  emails.forEach((email) => {
    const emailElement = document.createElement('div');
    emailElement.innerHTML = `
      <h2>From: ${email.from}</h2>
      <h3>To: ${email.to}</h3>
      <pre>${email.payload.join('\n')}</pre>
    `;
    emailsDiv.appendChild(emailElement);
  });
}


//Inicializace aplikace
async function init() {
  const packets = await fetchPackets();
  if (packets.length === 0) {
    console.error('No packets fetched');
    return;
  }
  const emails = assembleEmails(packets);
  displayEmails(emails);
}

init();
