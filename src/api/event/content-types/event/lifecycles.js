module.exports = {
    async beforeCreate(event) {
        const { data } = event.params;
        await populateSongNames(data);
    },

    async beforeUpdate(event) {
        const { data } = event.params;
        await populateSongNames(data);
    },
};

async function populateSongNames(data) {
    if (data.cantos && Array.isArray(data.cantos)) {
        for (let canto of data.cantos) {
            // Caso 1: Es un componente existente (solo tiene ID)
            if (canto.id && !canto.song && !canto.song_name) {
                try {
                    // Buscar el componente completo
                    const cantoComponent = await strapi.db.query('event.canto-entry').findOne({
                        where: { id: canto.id },
                        populate: ['song']
                    });

                    if (cantoComponent && cantoComponent.song && cantoComponent.song.name) {
                        // Actualizar el componente con el song_name
                        await strapi.db.query('event.canto-entry').update({
                            where: { id: canto.id },
                            data: { song_name: cantoComponent.song.name }
                        });
                    }
                } catch (error) {
                    strapi.log.error(`Error processing existing component ${canto.id}:`, error);
                }
            }
            // Caso 2: Es un componente nuevo con datos (tiene song)
            else if (canto.song) {
                try {
                    let songId = typeof canto.song === 'object' ? canto.song.id : canto.song;

                    if (songId) {
                        const songData = await strapi.entityService.findOne('api::song.song', songId, {
                            fields: ['name']
                        });

                        if (songData && songData.name) {
                            canto.song_name = songData.name;
                        }
                    }
                } catch (error) {
                    strapi.log.error('Error fetching song name:', error);
                }
            }
        }
    }
}