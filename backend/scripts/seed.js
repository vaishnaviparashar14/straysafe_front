const bcrypt = require('bcryptjs');
const db = require('../config/database');
require('dotenv').config();

// Sample users
const sampleUsers = [
  {
    name: 'Admin User',
    email: 'admin@straysafe.com',
    password: 'admin123',
    role: 'admin',
    phone: '+1234567890',
    is_verified: true
  },
  {
    name: 'Sarah Johnson',
    email: 'sarah@example.com',
    password: 'password123',
    role: 'citizen',
    phone: '+1234567891',
    is_verified: true
  },
  {
    name: 'Maria Garcia',
    email: 'maria@example.com',
    password: 'password123',
    role: 'citizen',
    phone: '+1234567892',
    is_verified: true
  },
  {
    name: 'James Chen',
    email: 'james@example.com',
    password: 'password123',
    role: 'citizen',
    phone: '+1234567893',
    is_verified: true
  },
  {
    name: 'NYC Animal Rescue',
    email: 'contact@nycanimalrescue.org',
    password: 'password123',
    role: 'ngo',
    phone: '+1234567894',
    organization: 'NYC Animal Rescue',
    is_verified: true
  },
  {
    name: 'Best Friends Animal Society',
    email: 'info@bestfriends.org',
    password: 'password123',
    role: 'ngo',
    phone: '+1234567895',
    organization: 'Best Friends Animal Society',
    is_verified: true
  },
  {
    name: 'Volunteer Mike',
    email: 'mike@example.com',
    password: 'password123',
    role: 'volunteer',
    phone: '+1234567896',
    is_verified: true
  }
];

// Sample NGOs
const sampleNGOs = [
  {
    organization_name: 'NYC Animal Rescue',
    registration_number: 'NYC-AR-2020-001',
    website: 'https://nycanimalrescue.org',
    description: 'Dedicated to rescuing and rehabilitating stray animals in New York City.',
    address: '123 Broadway, New York, NY 10001',
    city: 'New York',
    state: 'NY',
    country: 'USA',
    postal_code: '10001',
    contact_person: 'John Director',
    contact_email: 'john@nycanimalrescue.org',
    contact_phone: '+1234567894',
    service_areas: ['Manhattan', 'Brooklyn', 'Queens'],
    specializations: ['Dogs', 'Cats', 'Emergency Rescue'],
    is_approved: true,
    capacity_limit: 75
  },
  {
    organization_name: 'Best Friends Animal Society',
    registration_number: 'BF-AS-2019-002',
    website: 'https://bestfriends.org',
    description: 'Working to end the killing of animals in shelters across the country.',
    address: '456 Animal Way, New York, NY 10002',
    city: 'New York',
    state: 'NY',
    country: 'USA',
    postal_code: '10002',
    contact_person: 'Jane Manager',
    contact_email: 'jane@bestfriends.org',
    contact_phone: '+1234567895',
    service_areas: ['Manhattan', 'Bronx', 'Staten Island'],
    specializations: ['Dogs', 'Cats', 'Medical Care', 'Adoption'],
    is_approved: true,
    capacity_limit: 100
  }
];

// Sample reports
const sampleReports = [
  {
    title: 'Injured Dog Near Central Park',
    description: 'Found an injured stray dog near Central Park. Appears to have a wounded leg and is limping. Very friendly but needs immediate medical attention.',
    location_lat: 40.7829,
    location_lng: -73.9654,
    location_address: 'Central Park, New York, NY',
    photos: [
      'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/58997/pexels-photo-58997.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    status: 'in_progress',
    urgency: 'high',
    tags: ['injured', 'dog', 'medical-attention'],
    animal_type: 'Dog',
    animal_breed: 'Mixed',
    animal_size: 'medium',
    animal_color: 'Brown and White',
    animal_condition: 'Injured leg, otherwise healthy',
    is_injured: true,
    is_aggressive: false
  },
  {
    title: 'Mother Cat with Kittens',
    description: 'Found a mother cat with 3 small kittens in an abandoned building. They appear healthy but need shelter and food.',
    location_lat: 40.7505,
    location_lng: -73.9934,
    location_address: 'Brooklyn, NY',
    photos: [
      'https://images.pexels.com/photos/45201/kitty-cat-kitten-pet-45201.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    status: 'reported',
    urgency: 'medium',
    tags: ['cat', 'kittens', 'shelter-needed'],
    animal_type: 'Cat',
    animal_breed: 'Domestic Shorthair',
    animal_size: 'small',
    animal_color: 'Tabby',
    animal_condition: 'Healthy, nursing kittens',
    is_injured: false,
    is_aggressive: false
  },
  {
    title: 'Friendly Stray Looking for Home',
    description: 'Very friendly golden retriever mix, appears well-groomed. Might be lost rather than abandoned. No collar or tags visible.',
    location_lat: 40.7614,
    location_lng: -73.9776,
    location_address: 'Times Square, New York, NY',
    photos: [
      'https://images.pexels.com/photos/1254140/pexels-photo-1254140.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    status: 'rescued',
    urgency: 'low',
    tags: ['dog', 'friendly', 'possible-lost-pet'],
    animal_type: 'Dog',
    animal_breed: 'Golden Retriever Mix',
    animal_size: 'large',
    animal_color: 'Golden',
    animal_condition: 'Healthy, well-groomed',
    is_injured: false,
    is_aggressive: false
  },
  {
    title: 'Sick Puppy in Parking Lot',
    description: 'Small puppy found alone in a parking lot. Appears to be sick and malnourished. Needs immediate veterinary care.',
    location_lat: 40.7282,
    location_lng: -73.7949,
    location_address: 'Queens, NY',
    photos: [
      'https://images.pexels.com/photos/1490908/pexels-photo-1490908.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    status: 'reported',
    urgency: 'critical',
    tags: ['puppy', 'sick', 'abandoned', 'emergency'],
    animal_type: 'Dog',
    animal_breed: 'Unknown',
    animal_size: 'small',
    animal_color: 'Black',
    animal_condition: 'Sick, malnourished, needs medical attention',
    is_injured: true,
    is_aggressive: false
  }
];

// Sample report updates
const sampleUpdates = [
  {
    message: 'Report received. Team dispatched to location.',
    is_public: true
  },
  {
    message: 'Dog found and secured. Taking to veterinary clinic for treatment.',
    photos: ['https://images.pexels.com/photos/4587998/pexels-photo-4587998.jpeg?auto=compress&cs=tinysrgb&w=800'],
    is_public: true
  },
  {
    message: 'Dog has been successfully rescued and is being cared for at our facility.',
    is_public: true
  }
];

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Create users
    console.log('👥 Creating users...');
    const userIds = [];
    
    for (const userData of sampleUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      const userQuery = `
        INSERT INTO users (name, email, password_hash, role, phone, organization, is_verified, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `;
      
      const result = await db.query(userQuery, [
        userData.name,
        userData.email,
        hashedPassword,
        userData.role,
        userData.phone,
        userData.organization || null,
        userData.is_verified,
        true
      ]);
      
      userIds.push({
        id: result.rows[0].id,
        email: userData.email,
        role: userData.role
      });
    }
    
    console.log(`✅ Created ${userIds.length} users`);

    // Create NGOs
    console.log('🏢 Creating NGOs...');
    const ngoIds = [];
    
    for (let i = 0; i < sampleNGOs.length; i++) {
      const ngoData = sampleNGOs[i];
      const ngoUser = userIds.find(u => u.role === 'ngo' && u.email.includes(ngoData.organization_name.toLowerCase().replace(/\s+/g, '')));
      
      if (ngoUser) {
        const ngoQuery = `
          INSERT INTO ngos (
            user_id, organization_name, registration_number, website, description,
            address, city, state, country, postal_code, contact_person,
            contact_email, contact_phone, service_areas, specializations,
            is_approved, capacity_limit
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          RETURNING id
        `;
        
        const result = await db.query(ngoQuery, [
          ngoUser.id,
          ngoData.organization_name,
          ngoData.registration_number,
          ngoData.website,
          ngoData.description,
          ngoData.address,
          ngoData.city,
          ngoData.state,
          ngoData.country,
          ngoData.postal_code,
          ngoData.contact_person,
          ngoData.contact_email,
          ngoData.contact_phone,
          ngoData.service_areas,
          ngoData.specializations,
          ngoData.is_approved,
          ngoData.capacity_limit
        ]);
        
        ngoIds.push(result.rows[0].id);
      }
    }
    
    console.log(`✅ Created ${ngoIds.length} NGOs`);

    // Create reports
    console.log('📋 Creating reports...');
    const reportIds = [];
    
    for (let i = 0; i < sampleReports.length; i++) {
      const reportData = sampleReports[i];
      const reporterUser = userIds.find(u => u.role === 'citizen');
      
      if (reporterUser) {
        const reportQuery = `
          INSERT INTO reports (
            title, description, location_lat, location_lng, location_address,
            photos, status, urgency, tags, animal_type, animal_breed,
            animal_size, animal_color, animal_condition, is_injured, is_aggressive, reported_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          RETURNING id
        `;
        
        const result = await db.query(reportQuery, [
          reportData.title,
          reportData.description,
          reportData.location_lat,
          reportData.location_lng,
          reportData.location_address,
          reportData.photos,
          reportData.status,
          reportData.urgency,
          reportData.tags,
          reportData.animal_type,
          reportData.animal_breed,
          reportData.animal_size,
          reportData.animal_color,
          reportData.animal_condition,
          reportData.is_injured,
          reportData.is_aggressive,
          reporterUser.id
        ]);
        
        reportIds.push(result.rows[0].id);
      }
    }
    
    console.log(`✅ Created ${reportIds.length} reports`);

    // Assign some reports to NGOs
    console.log('🔗 Assigning reports to NGOs...');
    
    if (reportIds.length > 0 && ngoIds.length > 0) {
      // Assign first report to first NGO
      await db.query(
        'UPDATE reports SET assigned_ngo = $1 WHERE id = $2',
        [ngoIds[0], reportIds[0]]
      );
      
      // Assign third report to second NGO
      if (reportIds.length > 2 && ngoIds.length > 1) {
        await db.query(
          'UPDATE reports SET assigned_ngo = $1 WHERE id = $2',
          [ngoIds[1], reportIds[2]]
        );
      }
    }

    // Create report updates
    console.log('💬 Creating report updates...');
    
    if (reportIds.length > 0) {
      const ngoUser = userIds.find(u => u.role === 'ngo');
      
      if (ngoUser) {
        for (let i = 0; i < sampleUpdates.length; i++) {
          const updateData = sampleUpdates[i];
          
          const updateQuery = `
            INSERT INTO report_updates (report_id, message, photos, author_id, is_public)
            VALUES ($1, $2, $3, $4, $5)
          `;
          
          await db.query(updateQuery, [
            reportIds[0], // First report
            updateData.message,
            updateData.photos || [],
            ngoUser.id,
            updateData.is_public
          ]);
        }
      }
    }

    // Create sample notifications
    console.log('🔔 Creating notifications...');
    
    const citizenUser = userIds.find(u => u.role === 'citizen');
    
    if (citizenUser && reportIds.length > 0) {
      const notificationQuery = `
        INSERT INTO notifications (user_id, title, message, type, related_report_id)
        VALUES ($1, $2, $3, $4, $5)
      `;
      
      await db.query(notificationQuery, [
        citizenUser.id,
        'Report Updated',
        'Your report has been updated by NYC Animal Rescue',
        'report_update',
        reportIds[0]
      ]);
    }

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Users: ${userIds.length}`);
    console.log(`- NGOs: ${ngoIds.length}`);
    console.log(`- Reports: ${reportIds.length}`);
    console.log(`- Updates: ${sampleUpdates.length}`);
    
    console.log('\n🔐 Login credentials:');
    console.log('Admin: admin@straysafe.com / admin123');
    console.log('Citizen: sarah@example.com / password123');
    console.log('NGO: contact@nycanimalrescue.org / password123');
    console.log('Volunteer: mike@example.com / password123');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✅ Seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedDatabase;