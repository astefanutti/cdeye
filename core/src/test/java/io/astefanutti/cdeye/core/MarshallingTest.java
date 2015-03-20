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
package io.astefanutti.cdeye.core;


import io.astefanutti.cdeye.core.model.CdEyeBean;
import io.astefanutti.cdeye.core.model.CdEyeBeans;
import org.junit.Test;

import javax.xml.bind.JAXBContext;
import javax.xml.bind.JAXBException;
import javax.xml.bind.Marshaller;
import javax.xml.bind.Unmarshaller;
import java.io.StringReader;
import java.io.StringWriter;
import java.io.Writer;

public class MarshallingTest {

    @Test
    public void marshall() throws JAXBException {
        CdEyeBeans beans = new CdEyeBeans();

        CdEyeBean cdEyeBean1 = beans.withNewBean()
            .withId("0")
            .withClassName("bean.name1")
            .withClassSimpleName("name1");

        CdEyeBean cdEyeBean2 = beans.withNewBean()
            .withId("1")
            .withClassName("bean.name2")
            .withClassSimpleName("name2");

        cdEyeBean2.withInjectionPoints()
            .withNewInjectionPoint()
            .setBean(cdEyeBean1);

        JAXBContext context = JAXBContext.newInstance(CdEyeBeans.class);
        Marshaller marshaller = context.createMarshaller();
        marshaller.setProperty("eclipselink.media-type", "application/json");
        marshaller.setProperty(Marshaller.JAXB_FORMATTED_OUTPUT, true);
        Writer writer = new StringWriter();
        marshaller.marshal(beans, writer);

        System.out.println(writer.toString());

        Unmarshaller unmarshaller = context.createUnmarshaller();
        unmarshaller.setProperty("eclipselink.media-type", "application/json");
        CdEyeBeans beans2 = (CdEyeBeans) unmarshaller.unmarshal(new StringReader(writer.toString()));

        CdEyeBean bean = beans2.getBean().get(1).getInjectionPoints().getInjectionPoint().get(0).getBean();
        System.out.println(bean.getClassName());
     }
}
