/**
 * Copyright (C) 2014 Antonin Stefanutti (antonin.stefanutti@gmail.com)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package io.astefanutti.cdeye.web;

import io.astefanutti.cdeye.core.CdEye;
import io.astefanutti.cdeye.core.model.CdEyeBean;
import io.astefanutti.cdeye.core.model.CdEyeBeans;

import javax.annotation.ManagedBean;
import javax.enterprise.inject.spi.Bean;
import javax.enterprise.inject.spi.BeanManager;
import javax.enterprise.inject.spi.InjectionPoint;
import javax.inject.Inject;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;

@ManagedBean
@Path("beans")
public class BeansResource {

    @Inject
    private CdEye cdEye;

    // TODO: find a way to hide CDEye Web internal beans

    @GET
    @Produces({MediaType.APPLICATION_JSON, MediaType.APPLICATION_XML})
    public CdEyeBeans getBeans() {
        CdEyeBeans beans = new CdEyeBeans();
        for (Bean<?> bean : cdEye.getBeans()) {
            CdEyeBean cdEyeBean = cdEyeBean(bean);
            for (InjectionPoint ip : bean.getInjectionPoints()) {
                // Skip InjectionPoint and BeanManager injection points
                if (ip.getType().equals(InjectionPoint.class) || ip.getType().equals(BeanManager.class))
                    continue;
                cdEyeBean.withInjectionPoints()
                    .withNewInjectionPoint()
                    .withBean(cdEyeBean(cdEye.resolveBean(ip)));
            }

            if (!cdEye.isProducer(bean))
                for (Bean<?> producer : cdEye.getProducers(bean.getBeanClass()))
                    cdEyeBean.withProducers()
                        .withNewProducer()
                        .withName(cdEye.getProducerName(producer))
                        .withBean(cdEyeBean(producer));

            beans.withBean(cdEyeBean);
        }
        return beans;
    }

    private CdEyeBean cdEyeBean(Bean<?> bean) {
        return new CdEyeBean()
            .withId(cdEye.getBeanId(bean))
            .withClassName(bean.getBeanClass().getName())
            .withClassSimpleName(bean.getBeanClass().getSimpleName());
    }
}
