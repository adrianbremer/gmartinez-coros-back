const customizations = {
    // Content Type customizations
    'api::tenant.tenant': {
        info: {
            displayName: 'Organizations',
            description: 'Manage choir organizations and tenants'
        },
        attributes: {
            name: {
                displayName: 'Organization Name'
            },
            administrator: {
                displayName: 'Administrator'
            },
            settings: {
                displayName: 'Configuration Settings'
            },
            status: {
                displayName: 'Status'
            }
        }
    },
    'api::person.person': {
        info: {
            displayName: 'People Directory',
            description: 'Directory of choir members and contacts'
        },
        attributes: {
            first_name: {
                displayName: 'First Name'
            },
            middle_name: {
                displayName: 'Middle Name'
            },
            last_name: {
                displayName: 'Last Name'
            },
            last_name_2: {
                displayName: 'Second Last Name'
            },
            birth_date: {
                displayName: 'Date of Birth'
            },
            phone: {
                displayName: 'Phone Number'
            },
            email: {
                displayName: 'Email Address'
            },
            photo: {
                displayName: 'Profile Photo'
            },
            notes: {
                displayName: 'Additional Notes'
            }
        }
    },
    'api::choir.choir': {
        info: {
            displayName: 'Choirs',
            description: 'Manage choir groups and ensembles'
        },
        attributes: {
            name: {
                displayName: 'Choir Name'
            },
            description: {
                displayName: 'Description'
            },
            contact_email: {
                displayName: 'Contact Email'
            },
            status: {
                displayName: 'Status'
            }
        }
    },
    'api::song.song': {
        info: {
            displayName: 'Song Library',
            description: 'Manage songs, sheet music, and recordings'
        },
        attributes: {
            name: {
                displayName: 'Song Title'
            },
            notes: {
                displayName: 'Notes & Observations'
            },
            lyrics_file: {
                displayName: 'Lyrics File'
            },
            sheet_music_file: {
                displayName: 'Sheet Music'
            },
            backing_track_file: {
                displayName: 'Backing Track'
            },
            recording_file: {
                displayName: 'Recording'
            },
            status: {
                displayName: 'Status'
            }
        }
    }
};

module.exports = customizations;
