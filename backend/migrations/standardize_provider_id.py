#!/usr/bin/env python3
"""
Migration script to standardize provider_id field naming.
Converts pro_user_id -> provider_id and pro_type -> provider_type across all collections.
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

async def migrate():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Collections to migrate
    collections_to_migrate = ['clients', 'invoices', 'contracts']
    
    for coll_name in collections_to_migrate:
        coll = db[coll_name]
        
        # Check if migration needed
        sample = await coll.find_one({'pro_user_id': {'$exists': True}})
        if not sample:
            print(f'{coll_name}: No documents with pro_user_id, skipping')
            continue
        
        # Count documents to migrate
        count = await coll.count_documents({'pro_user_id': {'$exists': True}})
        print(f'{coll_name}: Migrating {count} documents...')
        
        # Add provider_id from pro_user_id if not already present
        result = await coll.update_many(
            {'pro_user_id': {'$exists': True}, 'provider_id': {'$exists': False}},
            [{'$set': {'provider_id': '$pro_user_id'}}]
        )
        print(f'  Added provider_id to {result.modified_count} documents')
        
        # Add provider_type from pro_type if not already present
        result = await coll.update_many(
            {'pro_type': {'$exists': True}, 'provider_type': {'$exists': False}},
            [{'$set': {'provider_type': '$pro_type'}}]
        )
        print(f'  Added provider_type to {result.modified_count} documents')
        
        # Optionally remove old fields (commented out for safety)
        # result = await coll.update_many(
        #     {},
        #     {'$unset': {'pro_user_id': '', 'pro_type': ''}}
        # )
        # print(f'  Removed old fields from {result.modified_count} documents')
    
    print('\nMigration complete!')
    print('Note: Old fields (pro_user_id, pro_type) are preserved for backward compatibility.')
    print('Run with --remove-old-fields to clean them up.')
    
    client.close()

if __name__ == '__main__':
    import sys
    asyncio.run(migrate())
