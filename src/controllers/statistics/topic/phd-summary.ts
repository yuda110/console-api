import httpContext from 'express-http-context';
import moment from 'moment-timezone';

import { PhdSummaryFactory } from '@factories/statistics/topic/phd-summary';
import grpcClient from '@lib/grpc-client';

import { requestCache } from './request-cache';

const getDefaultQuery = () => {
    return {
        aggregate: [
            {
                query: {
                    resource_type: 'inventory.CloudService',
                    query: {
                        aggregate: [{
                            group: {
                                keys: [
                                    {
                                        name: 'resource_id',
                                        key: 'reference.resource_id'
                                    }
                                ],
                                fields: [
                                    {
                                        name: 'affected_projects',
                                        key: 'project_id',
                                        operator: 'add_to_set'
                                    },
                                    {
                                        name: 'event_title',
                                        key: 'data.event_title',
                                        operator: 'first'
                                    },
                                    {
                                        name: 'event_type_category',
                                        key: 'data.event_type_category',
                                        operator: 'first'
                                    },
                                    {
                                        name: 'region_code',
                                        key: 'region_code',
                                        operator: 'first'
                                    },
                                    {
                                        name: 'service',
                                        key: 'data.service',
                                        operator: 'first'
                                    },
                                    {
                                        name: 'last_update_time',
                                        key: 'data.last_update_time',
                                        operator: 'first'
                                    }
                                ]
                            }
                        }],
                        filter: [
                            {
                                key: 'provider',
                                value: 'aws',
                                operator: 'eq'
                            },
                            {
                                key: 'cloud_service_group',
                                value: 'PersonalHealthDashboard',
                                operator: 'eq'
                            },
                            {
                                key: 'cloud_service_type',
                                value: 'Event',
                                operator: 'eq'
                            },
                            // {
                            //     key: 'data.has_affected_resources',
                            //     value: true,
                            //     operator: 'eq'
                            // },
                            {
                                key: 'data.status_code',
                                value: 'closed',
                                operator: 'not'
                            },
                            {
                                key: 'data.event_type_category',
                                value: [
                                    'issue',
                                    'scheduledChange'
                                ],
                                operator: 'in'
                            }
                        ]
                    }
                }
            },
            {
                sort: {
                    key: 'last_update_time',
                    desc: true
                }
            }
        ]
    };
};

const makeRequest = (params) => {
    const requestParams: any = getDefaultQuery();

    if (params.period) {
        if (typeof params.period !== 'number') {
            throw new Error('Parameter type is invalid. (params.period = integer)');
        }

        const dt = moment().tz('UTC').add(-params.period, 'days');
        requestParams['aggregate'][0]['query']['query']['filter_or'] = [
            {
                k: 'data.last_update_time',
                v: dt.format('YYYY-MM-DDTHH:mm:ss'),
                o: 'gte'
            },
            {
                k: 'data.start_time',
                v: dt.format('YYYY-MM-DDTHH:mm:ss'),
                o: 'gte'
            }
        ];
    }

    if (params.domain_id) {
        requestParams['domain_id'] = params.domain_id;
    }

    return requestParams;
};

const requestStat = async (params) => {
    if (httpContext.get('mock_mode')) {
        return {
            results: PhdSummaryFactory.buildBatch(10),
            total_count: 10
        };
    }

    const statisticsV1 = await grpcClient.get('statistics', 'v1');
    const requestParams = makeRequest(params);
    const response = await statisticsV1.Resource.stat(requestParams);

    return response;
};

const phdSummary = async (params) => {
    return await requestCache('stat:phdSummary', params, requestStat);
};

export default phdSummary;
