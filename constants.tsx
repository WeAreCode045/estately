
import { Project, User, UserRole, ProjectStatus, Contract, ContractStatus, ContractTemplate } from './types';

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Alice Admin', email: 'alice@agency.com', role: UserRole.ADMIN, avatar: 'https://picsum.photos/seed/alice/100' },
  { id: 'u2', name: 'Bob Seller', email: 'bob@seller.com', role: UserRole.SELLER, avatar: 'https://picsum.photos/seed/bob/100' },
  { id: 'u3', name: 'Charlie Buyer', email: 'charlie@buyer.com', role: UserRole.BUYER, avatar: 'https://picsum.photos/seed/charlie/100' },
];

export const MOCK_TEMPLATES: ContractTemplate[] = [
  {
    id: 'tmpl-1',
    name: 'Standard Residential Purchase Agreement',
    content: `# REAL ESTATE PURCHASE AGREEMENT\n\nThis Agreement is entered into on [DATE] between [SELLER_NAME] ("Seller") and [BUYER_NAME] ("Buyer").\n\n## 1. PROPERTY ADDRESS\nThe property is located at: [PROPERTY_ADDRESS]\n\n## 2. PURCHASE PRICE\nThe total purchase price for the Property is $[PRICE].\n\n## 3. CLOSING DATE\nThe closing of this transaction shall occur on [CLOSING_DATE].\n\n## 4. SIGNATURES\nSeller Signature: _________________\nBuyer Signature: _________________`
  },
  {
    id: 'tmpl-2',
    name: 'Exclusive Right to Sell Listing Agreement',
    content: `# LISTING AGREEMENT\n\nThis Agreement is between [SELLER_NAME] and EstateFlow Agency.\n\n## 1. LISTING TERMS\nThe Seller grants the Agency exclusive rights to market the property at [PROPERTY_ADDRESS].\n\n## 2. LIST PRICE\nThe property shall be listed at $[PRICE].`
  }
];

export const MOCK_CONTRACTS: Contract[] = [
  {
    id: 'c1',
    projectId: 'p1',
    title: 'Sales Purchase Agreement',
    content: 'Standard Real Estate Sales Agreement for 123 Pinecrest Ave...',
    status: ContractStatus.PENDING_SIGNATURE,
    assignees: ['u2', 'u3'],
    signedBy: ['u3'],
    createdAt: '2024-05-24T10:00:00',
    signatureData: {
        'u3': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
    }
  }
];

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'p1',
    title: 'Modern Villa in Suburbia',
    property: {
      address: '123 Pinecrest Ave, Green Valley, CA',
      price: 1250000,
      description: 'A beautiful 4-bedroom villa with modern finishes and a swimming pool.',
      bedrooms: 4,
      bathrooms: 3.5,
      sqft: 3200,
      images: ['https://picsum.photos/seed/house1/800/600', 'https://picsum.photos/seed/house2/800/600']
    },
    sellerId: 'u2',
    buyerId: 'u3',
    managerId: 'u1',
    status: ProjectStatus.ACTIVE,
    tasks: [
      { id: 't1', title: 'Home Inspection', completed: true, dueDate: '2024-05-10', category: 'Inspection' },
      { id: 't2', title: 'Title Search', completed: false, dueDate: '2024-05-20', category: 'Legal' }
    ],
    milestones: [
      { id: 'm1', title: 'Listing Live', date: '2024-04-01', achieved: true },
      { id: 'm2', title: 'Offer Accepted', date: '2024-04-15', achieved: true },
      { id: 'm3', title: 'Closing Date', date: '2024-06-30', achieved: false }
    ],
    agenda: [
      { id: 'e1', title: 'Final Walkthrough', start: '2024-06-28T10:00:00', end: '2024-06-28T11:00:00', type: 'Viewing', participants: ['u2', 'u3'] }
    ],
    contractIds: ['c1'],
    // Fix: Added missing required property 'messages'
    messages: []
  }
];
