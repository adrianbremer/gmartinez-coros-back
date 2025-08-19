/**
 * Seed script for Coffee Coros initial data
 * Run with: npm run seed:catalog
 */

'use strict';

const seedCatalogData = async () => {
    console.log('🌱 Starting Coffee Coros catalog seed...');

    try {
        // Get default tenant or create one
        let tenant = await strapi.entityService.findMany('api::tenant.tenant', {
            limit: 1,
        });

        if (!tenant || tenant.length === 0) {
            console.log('📝 Creating default tenant...');
            tenant = await strapi.entityService.create('api::tenant.tenant', {
                data: {
                    name: 'Coro Parroquia Santa María',
                    status: 'active',
                    settings: {
                        defaultLiturgicalLanguage: 'es',
                        timeZone: 'America/Mexico_City'
                    }
                }
            });
            console.log(`✅ Created tenant: ${tenant.name}`);
        } else {
            tenant = tenant[0];
            console.log(`📋 Using existing tenant: ${tenant.name}`);
        }

        // Seed Liturgical Sections
        console.log('📖 Seeding liturgical sections...');
        const liturgicalSections = [
            { name: 'Preludio', description: 'Pieza instrumental o vocal de apertura', order_sequence: 1, is_required: false },
            { name: 'Entrada', description: 'Himno procesional', order_sequence: 2, is_required: true },
            { name: 'Gloria', description: 'Himno Gloria a Dios', order_sequence: 3, is_required: true },
            { name: 'Salmo Responsorial', description: 'Respuesta del salmo', order_sequence: 4, is_required: true },
            { name: 'Aclamación al Evangelio', description: 'Aleluya o verso del Evangelio', order_sequence: 5, is_required: true },
            { name: 'Ofertorio', description: 'Preparación de los dones', order_sequence: 6, is_required: true },
            { name: 'Santo', description: 'Santo, Santo, Santo', order_sequence: 7, is_required: true },
            { name: 'Aclamación Memorial', description: 'Cristo ha muerto, Cristo ha resucitado', order_sequence: 8, is_required: true },
            { name: 'Amén', description: 'Gran Amén', order_sequence: 9, is_required: true },
            { name: 'Cordero de Dios', description: 'Agnus Dei', order_sequence: 10, is_required: true },
            { name: 'Comunión', description: 'Himno de comunión', order_sequence: 11, is_required: true },
            { name: 'Salida', description: 'Himno de despedida', order_sequence: 12, is_required: false }
        ];

        for (const section of liturgicalSections) {
            const existing = await strapi.entityService.findMany('api::liturgical-section.liturgical-section', {
                filters: {
                    name: section.name,
                    tenant: tenant.id
                }
            });

            if (!existing || existing.length === 0) {
                await strapi.entityService.create('api::liturgical-section.liturgical-section', {
                    data: {
                        ...section,
                        tenant: tenant.id
                    }
                });
                console.log(`  ✅ Created liturgical section: ${section.name}`);
            } else {
                console.log(`  📋 Liturgical section already exists: ${section.name}`);
            }
        }

        // Seed Liturgical Seasons
        console.log('🗓️ Seeding liturgical seasons...');
        const liturgicalSeasons = [
            {
                name: 'Adviento',
                description: 'Tiempo de preparación para la Navidad',
                color: 'Morado',
                start_date: '2024-12-01',
                end_date: '2024-12-24'
            },
            {
                name: 'Navidad',
                description: 'Tiempo navideño',
                color: 'Blanco',
                start_date: '2024-12-25',
                end_date: '2025-01-13'
            },
            {
                name: 'Tiempo Ordinario',
                description: 'Tiempo litúrgico regular',
                color: 'Verde',
                start_date: '2025-01-14',
                end_date: '2025-03-04'
            },
            {
                name: 'Cuaresma',
                description: 'Tiempo de preparación para la Pascua',
                color: 'Morado',
                start_date: '2025-03-05',
                end_date: '2025-04-19'
            },
            {
                name: 'Pascua',
                description: 'Tiempo pascual',
                color: 'Blanco',
                start_date: '2025-04-20',
                end_date: '2025-06-08'
            },
            {
                name: 'Pentecostés',
                description: 'Tiempo de Pentecostés',
                color: 'Rojo',
                start_date: '2025-06-09',
                end_date: '2025-11-30'
            }
        ];

        for (const season of liturgicalSeasons) {
            const existing = await strapi.entityService.findMany('api::liturgical-season.liturgical-season', {
                filters: {
                    name: season.name,
                    tenant: tenant.id
                }
            });

            if (!existing || existing.length === 0) {
                await strapi.entityService.create('api::liturgical-season.liturgical-season', {
                    data: {
                        ...season,
                        tenant: tenant.id
                    }
                });
                console.log(`  ✅ Created liturgical season: ${season.name}`);
            } else {
                console.log(`  📋 Liturgical season already exists: ${season.name}`);
            }
        }

        // Seed Vestments
        console.log('👔 Seeding vestments...');
        const vestments = [
            {
                name: 'Gala',
                description: 'Vestimenta formal para ocasiones especiales - Negro elegante',
                occasion: 'Ceremonias solemnes, bodas, funerales'
            },
            {
                name: 'Civil',
                description: 'Vestimenta regular elegante para misas dominicales',
                occasion: 'Misas regulares, celebraciones comunitarias'
            },
            {
                name: 'Blanco/Beige',
                description: 'Vestimenta de colores claros para temporadas específicas',
                occasion: 'Navidad, Pascua, celebraciones marianas'
            }
        ];

        for (const vestment of vestments) {
            const existing = await strapi.entityService.findMany('api::vestment.vestment', {
                filters: {
                    name: vestment.name,
                    tenant: tenant.id
                }
            });

            if (!existing || existing.length === 0) {
                await strapi.entityService.create('api::vestment.vestment', {
                    data: {
                        ...vestment,
                        tenant: tenant.id
                    }
                });
                console.log(`  ✅ Created vestment: ${vestment.name}`);
            } else {
                console.log(`  📋 Vestment already exists: ${vestment.name}`);
            }
        }

        console.log('🎉 Coffee Coros catalog seed completed successfully!');
        console.log(`📊 Summary:`);
        console.log(`   - Tenant: ${tenant.name}`);
        console.log(`   - Liturgical Sections: ${liturgicalSections.length} items`);
        console.log(`   - Liturgical Seasons: ${liturgicalSeasons.length} items`);
        console.log(`   - Vestments: ${vestments.length} items`);

    } catch (error) {
        console.error('❌ Error seeding catalog data:', error);
        throw error;
    }
};

module.exports = {
    seedCatalogData
};

// If script is run directly
if (require.main === module) {
    (async () => {
        try {
            await seedCatalogData();
            process.exit(0);
        } catch (error) {
            console.error('Seed failed:', error);
            process.exit(1);
        }
    })();
}
