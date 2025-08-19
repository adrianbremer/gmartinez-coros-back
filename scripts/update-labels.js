/**
 * Script to add displayName properties to all schema attributes
 * Run with: node scripts/update-labels.js
 */

const fs = require('fs');
const path = require('path');

// Mapping of field names to proper display names
const fieldDisplayNames = {
    // Common fields
    'name': 'Name',
    'description': 'Description',
    'notes': 'Notes',
    'status': 'Status',
    'tenant': 'Organization',

    // Person fields
    'first_name': 'First Name',
    'middle_name': 'Middle Name',
    'last_name': 'Last Name',
    'last_name_2': 'Second Last Name',
    'birth_date': 'Date of Birth',
    'phone': 'Phone Number',
    'email': 'Email Address',
    'photo': 'Profile Photo',

    // Song fields
    'lyrics_file': 'Lyrics File',
    'sheet_music_file': 'Sheet Music',
    'backing_track_file': 'Backing Track',
    'recording_file': 'Recording',

    // Event fields
    'event_date': 'Event Date',
    'venue': 'Venue',
    'special_instructions': 'Special Instructions',
    'vestment_requirement': 'Vestment Required',
    'liturgical_season': 'Liturgical Season',
    'liturgical_sections': 'Liturgical Sections',
    'liturgical_seasons': 'Liturgical Seasons',

    // Choir fields
    'contact_email': 'Contact Email',
    'repertoire': 'Repertoire',
    'event_programs': 'Event Programs',
    'choir_memberships': 'Choir Memberships',

    // Relationships
    'persons': 'People',
    'choirs': 'Choirs',
    'songs': 'Songs',
    'events': 'Events',
    'vestments': 'Vestments',
    'members': 'Members',
    'programs': 'Programs',
    'administrator': 'Administrator',
    'settings': 'Settings',

    // Choir Member fields
    'joined_date': 'Date Joined',
    'voice_part': 'Voice Part',
    'choir': 'Choir',
    'person': 'Person',

    // Event Program fields
    'rehearsal_notes': 'Rehearsal Notes',
    'event': 'Event',

    // Event Program Song fields
    'performance_order': 'Performance Order',
    'special_notes': 'Special Notes',
    'event_program': 'Event Program',
    'song': 'Song',
    'liturgical_section': 'Liturgical Section',

    // Catalog fields
    'order_sequence': 'Order in Mass',
    'is_required': 'Required',
    'color': 'Liturgical Color',
    'start_date': 'Start Date',
    'end_date': 'End Date',
    'occasion': 'Occasions of Use',

    // Component fields
    'phone_2': 'Secondary Phone',
    'whatsapp': 'WhatsApp',
    'address': 'Address',
    'relationship': 'Relationship',
    'contact_name': 'Contact Name',
    'contact_role': 'Role',
    'contact_phone': 'Contact Phone',
    'event_contacts': 'Event Contacts',
    'contact_info': 'Contact Information',
    'emergency_contact': 'Emergency Contact'
};

function updateSchemaLabels(filePath) {
    try {
        const schema = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        let updated = false;

        // Update attributes
        if (schema.attributes) {
            for (const [fieldName, fieldConfig] of Object.entries(schema.attributes)) {
                if (fieldDisplayNames[fieldName] && !fieldConfig.displayName) {
                    fieldConfig.displayName = fieldDisplayNames[fieldName];
                    updated = true;
                }
            }
        }

        if (updated) {
            fs.writeFileSync(filePath, JSON.stringify(schema, null, 4));
            console.log(`✅ Updated: ${filePath}`);
            return true;
        } else {
            console.log(`📋 No changes needed: ${filePath}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ Error updating ${filePath}:`, error.message);
        return false;
    }
}

function updateComponentLabels(filePath) {
    try {
        const component = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        let updated = false;

        // Update attributes
        if (component.attributes) {
            for (const [fieldName, fieldConfig] of Object.entries(component.attributes)) {
                if (fieldDisplayNames[fieldName] && !fieldConfig.displayName) {
                    fieldConfig.displayName = fieldDisplayNames[fieldName];
                    updated = true;
                }
            }
        }

        if (updated) {
            fs.writeFileSync(filePath, JSON.stringify(component, null, 4));
            console.log(`✅ Updated component: ${filePath}`);
            return true;
        } else {
            console.log(`📋 No changes needed for component: ${filePath}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ Error updating component ${filePath}:`, error.message);
        return false;
    }
}

function findAndUpdateSchemas(directory) {
    const items = fs.readdirSync(directory);
    let totalUpdated = 0;

    for (const item of items) {
        const fullPath = path.join(directory, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            totalUpdated += findAndUpdateSchemas(fullPath);
        } else if (item === 'schema.json') {
            if (updateSchemaLabels(fullPath)) {
                totalUpdated++;
            }
        } else if (item.endsWith('.json') && fullPath.includes('components')) {
            if (updateComponentLabels(fullPath)) {
                totalUpdated++;
            }
        }
    }

    return totalUpdated;
}

console.log('🏷️ Updating display names for all schemas and components...');

const srcPath = path.join(__dirname, '..', 'src');
const totalUpdated = findAndUpdateSchemas(srcPath);

console.log(`\n🎉 Update complete! ${totalUpdated} files updated.`);
console.log('💡 Restart your Strapi server to see the changes.');

module.exports = { updateSchemaLabels, updateComponentLabels, fieldDisplayNames };
